import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { decryptAccessToken } from '@/lib/whatsapp/meta'
import { greenApiInstanceUrl } from '@/lib/whatsapp/green-api'

export const runtime = 'nodejs'
const text = (v: unknown, max = 4000) => typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : ''

export async function POST(request: Request) {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const to = text(body.to, 40).replace(/\D/g, '')
  const message = text(body.message, 20000)
  if (!to || to.length < 8 || !message) return NextResponse.json({ error: 'Numéro et message valides obligatoires.' }, { status: 400 })

  const { data: active, error: subError } = await supabase.rpc('whatsapp_subscription_active', { p_organization_id: membership.organizationId })
  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })
  if (!active) return NextResponse.json({ error: 'Abonnement WhatsApp GREEN-API expiré ou absent.', code: 'WHATSAPP_SUBSCRIPTION_EXPIRED' }, { status: 403 })

  const { data: instance, error } = await supabase
    .from('whatsapp_green_instances')
    .select('id,id_instance,api_url,api_token_cipher,status')
    .eq('organization_id', membership.organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!instance) return NextResponse.json({ error: 'Aucune instance GREEN-API connectée.' }, { status: 409 })
  if (instance.status !== 'authorized') return NextResponse.json({ error: 'WhatsApp GREEN-API n’est pas autorisé.', status: instance.status }, { status: 409 })

  try {
    const response = await fetch(
      greenApiInstanceUrl(instance.api_url, instance.id_instance, decryptAccessToken(instance.api_token_cipher), 'sendMessage'),
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chatId: `${to}@c.us`, message }), cache: 'no-store' },
    )
    const result = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok || result.code) throw new Error(typeof result.description === 'string' ? result.description : 'GREEN-API a refusé l’envoi.')

    const idMessage = typeof result.idMessage === 'string' ? result.idMessage : null
    const now = new Date().toISOString()

    let { data: contact } = await supabase
      .from('contacts')
      .select('id,first_name,last_name,phone,whatsapp_number')
      .eq('organization_id', membership.organizationId)
      .or(`whatsapp_number.eq.${to},phone.eq.${to}`)
      .limit(1)
      .maybeSingle()

    if (!contact) {
      const { data: createdContact } = await supabase
        .from('contacts')
        .insert({ organization_id: membership.organizationId, phone: to, whatsapp_number: to, status: 'lead', consent_status: 'unknown', custom_fields: {} })
        .select('id,first_name,last_name,phone,whatsapp_number')
        .single()
      contact = createdContact
    }

    if (contact) {
      await supabase.from('contacts').update({ whatsapp_number: to, last_activity_at: now }).eq('id', contact.id).eq('organization_id', membership.organizationId)
    }

    const { data: waContact } = await supabase
      .from('whatsapp_contacts')
      .upsert({
        organization_id: membership.organizationId,
        connection_id: null,
        contact_id: contact?.id,
        phone_number: to,
        wa_id: `${to}@c.us`,
        name: contact ? [contact.first_name, contact.last_name].filter(Boolean).join(' ') || null : null,
        last_outbound_at: now,
        updated_at: now,
      }, { onConflict: 'organization_id,phone_number' })
      .select('id,contact_id')
      .single()

    if (!waContact) return NextResponse.json({ ok: true, idMessage, persisted: false })

    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('id,unread_count')
      .eq('organization_id', membership.organizationId)
      .eq('whatsapp_contact_id', waContact.id)
      .is('connection_id', null)
      .maybeSingle()

    const conversationId = conversation?.id || (await supabase
      .from('whatsapp_conversations')
      .insert({
        organization_id: membership.organizationId,
        connection_id: null,
        contact_id: waContact.contact_id || contact?.id || null,
        whatsapp_contact_id: waContact.id,
        wa_conversation_id: `${to}@c.us`,
        origin: 'business_initiated',
        status: 'open',
        last_message_at: now,
        started_at: now,
        unread_count: 0,
      })
      .select('id')
      .single()).data?.id

    if (conversationId) {
      await supabase.from('whatsapp_messages').insert({
        organization_id: membership.organizationId,
        connection_id: null,
        conversation_id: conversationId,
        contact_id: contact?.id || null,
        direction: 'outbound',
        message_type: 'text',
        wa_message_id: idMessage,
        status: 'sent',
        content: message,
        payload: result,
        sent_at: now,
      })
      await supabase.from('whatsapp_conversations').update({ last_message_at: now, updated_at: now }).eq('id', conversationId)
    }

    return NextResponse.json({ ok: true, idMessage, conversationId: conversationId || null })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur GREEN-API.' }, { status: 502 })
  }
}
