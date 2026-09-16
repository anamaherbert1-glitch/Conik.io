import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { decryptAccessToken } from '@/lib/whatsapp/meta'
import { greenApiInstanceUrl } from '@/lib/whatsapp/green-api'

export const runtime = 'nodejs'
const text = (v: unknown, max = 4000) => typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : ''
const phone = (v: unknown) => text(v, 40).replace(/\D/g, '')
const personalize = (message: string, firstName: string | null) => message.replace(/\{\{\s*first_name\s*\}\}/gi, firstName || 'participant')

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { id } = await params
  const { data, error } = await supabase.from('live_events').select('id,title,slug,whatsapp_message_draft').eq('id', id).eq('organization_id', membership.organizationId).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })
  const { data: participants } = await supabase.from('live_event_participants').select('contact_id,email').eq('live_event_id', id).eq('organization_id', membership.organizationId).neq('status', 'blocked')
  const ids = (participants || []).map(p => p.contact_id).filter(Boolean)
  const { data: contacts } = ids.length ? await supabase.from('contacts').select('id,first_name,last_name,phone,whatsapp_number,consent_status').in('id', ids) : { data: [] }
  const eligible = (contacts || []).filter(c => Boolean(phone(c.whatsapp_number || c.phone)) && c.consent_status === 'opted_in')
  return NextResponse.json({ draft: data.whatsapp_message_draft || `Bonjour {{first_name}},\n\nVous êtes invité(e) à notre Live « ${data.title} ».\n\nRejoignez le Live ici : ${process.env.NEXT_PUBLIC_APP_URL || ''}/live/${data.slug}\n\nÀ bientôt !`, total_invited: participants?.length || 0, whatsapp_eligible: eligible.length })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const { id } = await params
  const body = await request.json().catch(() => null) as { message?: string } | null
  const message = text(body?.message, 4000)
  if (!message) return NextResponse.json({ error: 'Message invalide.' }, { status: 400 })

  const { data: live } = await supabase.from('live_events').select('id,title,slug').eq('id', id).eq('organization_id', membership.organizationId).maybeSingle()
  if (!live) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })

  const { data: active, error: subError } = await supabase.rpc('whatsapp_subscription_active', { p_organization_id: membership.organizationId })
  if (subError) return NextResponse.json({ error: subError.message }, { status: 500 })
  if (!active) return NextResponse.json({ error: 'Abonnement WhatsApp GREEN-API expiré ou absent.', code: 'WHATSAPP_SUBSCRIPTION_EXPIRED' }, { status: 403 })

  const { data: instance, error: instanceError } = await supabase.from('whatsapp_green_instances').select('id,id_instance,api_url,api_token_cipher,status').eq('organization_id', membership.organizationId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (instanceError) return NextResponse.json({ error: instanceError.message }, { status: 500 })
  if (!instance) return NextResponse.json({ error: 'Aucune instance GREEN-API connectée.' }, { status: 409 })
  if (instance.status !== 'authorized') return NextResponse.json({ error: 'WhatsApp GREEN-API n’est pas autorisé.', status: instance.status }, { status: 409 })

  const { data: participants, error: participantError } = await supabase.from('live_event_participants').select('contact_id').eq('live_event_id', id).eq('organization_id', membership.organizationId).neq('status', 'blocked')
  if (participantError) return NextResponse.json({ error: participantError.message }, { status: 500 })
  const ids = (participants || []).map(p => p.contact_id).filter(Boolean)
  const { data: contacts, error: contactError } = ids.length ? await supabase.from('contacts').select('id,first_name,last_name,phone,whatsapp_number,consent_status').in('id', ids) : { data: [], error: null }
  if (contactError) return NextResponse.json({ error: contactError.message }, { status: 500 })
  const recipients = (contacts || []).map(c => ({ ...c, to: phone(c.whatsapp_number || c.phone) })).filter(c => c.to.length >= 8 && c.consent_status === 'opted_in')
  if (!recipients.length) return NextResponse.json({ error: 'Aucun participant CRM éligible à WhatsApp (numéro + consentement requis).' }, { status: 409 })

  const now = new Date().toISOString()
  let sent = 0
  let failed = 0
  const results: Array<{ contact_id: string; to: string; status: 'sent' | 'failed'; idMessage?: string; error?: string }> = []
  const token = decryptAccessToken(instance.api_token_cipher)

  for (const recipient of recipients) {
    const personalized = personalize(message, recipient.first_name)
    try {
      const response = await fetch(greenApiInstanceUrl(instance.api_url, instance.id_instance, token, 'sendMessage'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chatId: `${recipient.to}@c.us`, message: personalized }),
        cache: 'no-store',
      })
      const result = await response.json().catch(() => ({})) as Record<string, unknown>
      if (!response.ok || result.code) throw new Error(typeof result.description === 'string' ? result.description : 'GREEN-API a refusé l’envoi.')
      const idMessage = typeof result.idMessage === 'string' ? result.idMessage : null

      const { data: waContact } = await supabase.from('whatsapp_contacts').upsert({ organization_id: membership.organizationId, connection_id: null, contact_id: recipient.id, phone_number: recipient.to, wa_id: `${recipient.to}@c.us`, name: [recipient.first_name, recipient.last_name].filter(Boolean).join(' ') || null, last_outbound_at: now, updated_at: now }, { onConflict: 'organization_id,phone_number' }).select('id,contact_id').single()
      if (waContact) {
        const { data: conversation } = await supabase.from('whatsapp_conversations').select('id').eq('organization_id', membership.organizationId).eq('whatsapp_contact_id', waContact.id).is('connection_id', null).maybeSingle()
        const conversationId = conversation?.id || (await supabase.from('whatsapp_conversations').insert({ organization_id: membership.organizationId, connection_id: null, contact_id: recipient.id, whatsapp_contact_id: waContact.id, wa_conversation_id: `${recipient.to}@c.us`, origin: 'business_initiated', status: 'open', last_message_at: now, started_at: now, unread_count: 0 }).select('id').single()).data?.id
        if (conversationId) {
          await supabase.from('whatsapp_messages').insert({ organization_id: membership.organizationId, connection_id: null, conversation_id: conversationId, contact_id: recipient.id, direction: 'outbound', message_type: 'text', wa_message_id: idMessage, status: 'sent', content: personalized, payload: { live_event_id: id, source: 'live_event_whatsapp', green_api: result }, sent_at: now })
          await supabase.from('whatsapp_conversations').update({ last_message_at: now, updated_at: now }).eq('id', conversationId)
        }
      }
      await supabase.from('contacts').update({ whatsapp_number: recipient.to, last_activity_at: now }).eq('id', recipient.id).eq('organization_id', membership.organizationId)
      sent++
      results.push({ contact_id: recipient.id, to: recipient.to, status: 'sent', idMessage: idMessage || undefined })
    } catch (e) {
      failed++
      results.push({ contact_id: recipient.id, to: recipient.to, status: 'failed', error: e instanceof Error ? e.message : 'Erreur GREEN-API.' })
    }
  }

  await supabase.from('live_events').update({ whatsapp_message_draft: message }).eq('id', id).eq('organization_id', membership.organizationId)
  await supabase.from('live_event_whatsapp_invites').insert({ live_event_id: id, organization_id: membership.organizationId, message, status: failed ? (sent ? 'partial' : 'failed') : 'sent' })

  return NextResponse.json({ ok: failed === 0, status: failed ? (sent ? 'partial' : 'failed') : 'sent', total_eligible: recipients.length, sent, failed, results })
}
