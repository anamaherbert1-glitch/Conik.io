import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { createClient } from '@/lib/supabase/server'
import { decryptAccessToken, getMetaConfig, sendCloudApiMessage } from '@/lib/whatsapp/meta'

export const runtime = 'nodejs'

const text = (value: unknown, max = 1000) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null

export async function POST(request: Request) {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const body = await request.json().catch(() => null)
  const connectionId = text(body?.connectionId, 100)
  const to = text(body?.to, 40)?.replace(/\D/g, '')
  const templateName = text(body?.templateName, 200)
  const templateLanguage = text(body?.templateLanguage, 40) || 'fr'
  const messageBody = text(body?.message, 4000)
  const variables = Array.isArray(body?.variables) ? body.variables.slice(0, 20).map((v: unknown) => ({ type: 'text', text: String(v).slice(0, 500) })) : []

  if (!connectionId || !to || to.length < 8) return NextResponse.json({ error: 'Connexion et numéro destinataire valides obligatoires.' }, { status: 400 })
  const isTemplate = Boolean(templateName)
  if (!isTemplate && !messageBody) return NextResponse.json({ error: 'Le message est obligatoire hors template.' }, { status: 400 })

  const { data: connection, error: connectionError } = await supabase.from('whatsapp_connections').select('id,organization_id,phone_number_id,status').eq('id', connectionId).eq('organization_id', membership.organizationId).maybeSingle()
  if (connectionError) return NextResponse.json({ error: connectionError.message }, { status: 500 })
  if (!connection || connection.status !== 'connected') return NextResponse.json({ error: 'Connexion WhatsApp inactive.' }, { status: 409 })

  const { data: eligibility, error: eligibilityError } = await supabase.rpc('whatsapp_send_eligibility', { p_connection_id: connection.id, p_phone_number: to, p_is_template: isTemplate })
  if (eligibilityError) return NextResponse.json({ error: eligibilityError.message }, { status: 400 })
  if (!eligibility?.allowed) return NextResponse.json({ error: `Envoi bloqué: ${eligibility?.code || 'non_eligible'}.` }, { status: 403 })

  const { data: credential, error: credentialError } = await supabase.rpc('whatsapp_get_credential', { p_secret: getMetaConfig().serverSecret, p_connection_id: connection.id })
  if (credentialError) return NextResponse.json({ error: credentialError.message }, { status: 500 })
  const row = Array.isArray(credential) ? credential[0] : credential
  if (!row?.access_token_cipher) return NextResponse.json({ error: 'Credential WhatsApp indisponible.' }, { status: 409 })

  const record = await supabase.rpc('whatsapp_record_outbound', {
    p_connection_id: connection.id,
    p_phone_number: to,
    p_message_type: isTemplate ? 'template' : 'text',
    p_content: messageBody,
    p_template_name: templateName,
    p_template_language: templateLanguage,
    p_payload: { source: 'api' },
  })
  if (record.error || !record.data?.ok) return NextResponse.json({ error: record.error?.message || `Impossible d'enregistrer le message: ${record.data?.reason || 'unknown'}.` }, { status: 400 })

  const messageId = record.data.messageId as string
  const payload = isTemplate
    ? { to, type: 'template', template: { name: templateName, language: { code: templateLanguage }, components: variables.length ? [{ type: 'body', parameters: variables }] : undefined } }
    : { to, type: 'text', text: { body: messageBody } }

  try {
    const sent = await sendCloudApiMessage(decryptAccessToken(row.access_token_cipher), connection.phone_number_id, payload)
    const waMessageId = Array.isArray(sent.messages) ? (sent.messages[0] as Record<string, unknown>)?.id : null
    await supabase.rpc('whatsapp_settle_outbound_system', { p_secret: getMetaConfig().serverSecret, p_message_id: messageId, p_status: 'sent', p_wa_message_id: typeof waMessageId === 'string' ? waMessageId : null, p_error_code: null, p_error_message: null })
    return NextResponse.json({ ok: true, messageId, waMessageId, status: 'sent' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Meta a refusé l’envoi.'
    await supabase.rpc('whatsapp_settle_outbound_system', { p_secret: getMetaConfig().serverSecret, p_message_id: messageId, p_status: 'failed', p_wa_message_id: null, p_error_code: null, p_error_message: message })
    return NextResponse.json({ error: message, messageId }, { status: 502 })
  }
}
