import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { decryptAccessToken, getMetaConfig, sendCloudApiMessage } from '@/lib/whatsapp/meta'

export const runtime = 'nodejs'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, membership } = await requireWorkspaceRole(['owner','admin','editor'])
  const { id } = await params
  const { data: campaign, error: campaignError } = await supabase.from('whatsapp_campaigns').select('id,connection_id,template_name,template_language,variable_mapping,status').eq('id', id).eq('organization_id', membership.organizationId).maybeSingle()
  if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 500 })
  if (!campaign) return NextResponse.json({ error: 'Campagne introuvable.' }, { status: 404 })
  if (!campaign.template_name) return NextResponse.json({ error: 'Template de campagne manquant.' }, { status: 409 })
  if (['completed','cancelled'].includes(campaign.status)) return NextResponse.json({ error: 'Cette campagne est déjà terminée.' }, { status: 409 })

  const { data: connection } = await supabase.from('whatsapp_connections').select('id,phone_number_id,status').eq('id', campaign.connection_id).eq('organization_id', membership.organizationId).maybeSingle()
  if (!connection || connection.status !== 'connected') return NextResponse.json({ error: 'Connexion WhatsApp inactive.' }, { status: 409 })
  const { data: credential, error: credentialError } = await supabase.rpc('whatsapp_get_credential', { p_secret: getMetaConfig().serverSecret, p_connection_id: connection.id })
  if (credentialError) return NextResponse.json({ error: credentialError.message }, { status: 500 })
  const row = Array.isArray(credential) ? credential[0] : credential
  if (!row?.access_token_cipher) return NextResponse.json({ error: 'Credential WhatsApp indisponible.' }, { status: 409 })

  const { data: recipients, error: recipientError } = await supabase.from('whatsapp_campaign_recipients').select('id,phone_number,variables').eq('campaign_id', campaign.id).eq('organization_id', membership.organizationId).eq('status','pending').order('created_at').limit(10)
  if (recipientError) return NextResponse.json({ error: recipientError.message }, { status: 500 })
  if (!recipients?.length) {
    await supabase.from('whatsapp_campaigns').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', campaign.id).eq('organization_id', membership.organizationId)
    return NextResponse.json({ ok: true, done: true, sent: 0 })
  }

  await supabase.from('whatsapp_campaigns').update({ status: 'sending', started_at: new Date().toISOString(), last_error: null }).eq('id', campaign.id).eq('organization_id', membership.organizationId)
  let sent = 0
  let failed = 0
  for (const recipient of recipients) {
    const eligibility = await supabase.rpc('whatsapp_send_eligibility', { p_connection_id: connection.id, p_phone_number: recipient.phone_number, p_is_template: true })
    if (eligibility.error || !eligibility.data?.allowed) {
      failed++
      await supabase.from('whatsapp_campaign_recipients').update({ status: 'skipped', skip_reason: eligibility.error?.message || eligibility.data?.code || 'not_eligible' }).eq('id', recipient.id).eq('organization_id', membership.organizationId)
      continue
    }
    const variables = Array.isArray(recipient.variables) ? recipient.variables.map((v: unknown) => ({ type: 'text', text: String(v).slice(0,500) })) : Object.values(recipient.variables || {}).map((v: unknown) => ({ type: 'text', text: String(v).slice(0,500) }))
    const record = await supabase.rpc('whatsapp_record_outbound', { p_connection_id: connection.id, p_phone_number: recipient.phone_number, p_message_type: 'template', p_content: null, p_template_name: campaign.template_name, p_template_language: campaign.template_language || 'fr', p_payload: { source: 'campaign', campaignId: campaign.id } })
    if (record.error || !record.data?.ok) {
      failed++
      await supabase.from('whatsapp_campaign_recipients').update({ status: 'failed', error_message: record.error?.message || record.data?.reason || 'record_failed' }).eq('id', recipient.id).eq('organization_id', membership.organizationId)
      continue
    }
    const messageId = record.data.messageId as string
    try {
      const result = await sendCloudApiMessage(decryptAccessToken(row.access_token_cipher), connection.phone_number_id, { to: recipient.phone_number, type: 'template', template: { name: campaign.template_name, language: { code: campaign.template_language || 'fr' }, components: variables.length ? [{ type: 'body', parameters: variables }] : undefined } })
      const waMessageId = Array.isArray(result.messages) ? (result.messages[0] as Record<string, unknown>)?.id : null
      await supabase.rpc('whatsapp_settle_outbound_system', { p_secret: getMetaConfig().serverSecret, p_message_id: messageId, p_status: 'sent', p_wa_message_id: typeof waMessageId === 'string' ? waMessageId : null, p_error_code: null, p_error_message: null })
      await supabase.from('whatsapp_campaign_recipients').update({ status: 'sent', message_id: messageId, attempt_count: 1 }).eq('id', recipient.id).eq('organization_id', membership.organizationId)
      sent++
    } catch (error) {
      failed++
      const message = error instanceof Error ? error.message : 'Meta a refusé l’envoi.'
      await supabase.rpc('whatsapp_settle_outbound_system', { p_secret: getMetaConfig().serverSecret, p_message_id: messageId, p_status: 'failed', p_wa_message_id: null, p_error_code: null, p_error_message: message })
      await supabase.from('whatsapp_campaign_recipients').update({ status: 'failed', message_id: messageId, attempt_count: 1, error_message: message }).eq('id', recipient.id).eq('organization_id', membership.organizationId)
    }
  }

  const { count: pending } = await supabase.from('whatsapp_campaign_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id).eq('organization_id', membership.organizationId).eq('status','pending')
  const { count: sentCount } = await supabase.from('whatsapp_campaign_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id).eq('organization_id', membership.organizationId).eq('status','sent')
  const { count: failedCount } = await supabase.from('whatsapp_campaign_recipients').select('id', { count: 'exact', head: true }).eq('campaign_id', campaign.id).eq('organization_id', membership.organizationId).eq('status','failed')
  await supabase.from('whatsapp_campaigns').update({ status: (pending || 0) > 0 ? 'sending' : 'completed', sent_count: sentCount || 0, failed_count: failedCount || 0, completed_at: (pending || 0) > 0 ? null : new Date().toISOString() }).eq('id', campaign.id).eq('organization_id', membership.organizationId)
  return NextResponse.json({ ok: true, sent, failed, pending: pending || 0, done: (pending || 0) === 0 })
}
