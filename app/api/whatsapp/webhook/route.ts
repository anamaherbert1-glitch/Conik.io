import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMetaConfig, verifyMetaSignatureHmac } from '@/lib/whatsapp/meta'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    if (mode === 'subscribe' && token === getMetaConfig().webhookVerifyToken && challenge) return new Response(challenge, { status: 200 })
    return new Response('Forbidden', { status: 403 })
  } catch {
    return new Response('Webhook configuration missing', { status: 503 })
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  try {
    const signature = request.headers.get('x-hub-signature-256')
    if (!verifyMetaSignatureHmac(rawBody, signature)) return new Response('Invalid signature', { status: 401 })

    const payload = JSON.parse(rawBody) as Record<string, unknown>
    if (payload.object !== 'whatsapp_business_account') return NextResponse.json({ received: true })

    const supabase = await createClient()
    const entries = Array.isArray(payload.entry) ? payload.entry : []

    for (const entry of entries as Array<Record<string, unknown>>) {
      const wabaId = typeof entry.id === 'string' ? entry.id : null
      const changes = Array.isArray(entry.changes) ? entry.changes : []
      for (const change of changes as Array<Record<string, unknown>>) {
        const field = typeof change.field === 'string' ? change.field : ''
        const value = (change.value || {}) as Record<string, unknown>
        const phoneNumberId = typeof value.metadata === 'object' && value.metadata && typeof (value.metadata as Record<string, unknown>).phone_number_id === 'string'
          ? (value.metadata as Record<string, unknown>).phone_number_id as string
          : null
        const messages = Array.isArray(value.messages) ? value.messages : []
        const statuses = Array.isArray(value.statuses) ? value.statuses : []

        if (messages.length || statuses.length) {
          const items = [...messages.map((m) => ({ kind: 'message', item: m })), ...statuses.map((s) => ({ kind: 'status', item: s }))]
          for (const item of items as Array<{ kind: string; item: Record<string, unknown> }>) {
            const waMessageId = typeof item.item.id === 'string' ? item.item.id : null
            const eventKey = `${field}:${phoneNumberId || ''}:${waMessageId || JSON.stringify(item.item).slice(0, 200)}`
            const { data: claimed, error: claimError } = await supabase.rpc('whatsapp_claim_webhook_event', {
              p_secret: getMetaConfig().serverSecret,
              p_event_key: eventKey,
              p_event_type: item.kind,
              p_phone_number_id: phoneNumberId,
              p_wa_message_id: waMessageId,
              p_payload: item.item,
            })
            if (claimError) throw new Error(claimError.message)
            if (!claimed) continue

            try {
              if (item.kind === 'message' && phoneNumberId) {
                const from = typeof item.item.from === 'string' ? item.item.from : ''
                const type = typeof item.item.type === 'string' ? item.item.type : 'text'
                const profile = (value.contacts && Array.isArray(value.contacts) ? value.contacts[0] : null) as Record<string, unknown> | null
                const profileName = profile && typeof profile.profile === 'object' && profile.profile ? (profile.profile as Record<string, unknown>).name : null
                const content = type === 'text' && typeof item.item.text === 'object' && item.item.text ? (item.item.text as Record<string, unknown>).body : null
                const result = await supabase.rpc('whatsapp_ingest_inbound', {
                  p_secret: getMetaConfig().serverSecret,
                  p_phone_number_id: phoneNumberId,
                  p_wa_message_id: waMessageId,
                  p_from: from,
                  p_profile_name: typeof profileName === 'string' ? profileName : null,
                  p_message_type: type,
                  p_content: typeof content === 'string' ? content : null,
                  p_media_url: null,
                  p_payload: item.item,
                  p_sent_at: new Date(Number(item.item.timestamp || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
                })
                if (result.error) throw new Error(result.error.message)
                const text = typeof content === 'string' ? content.trim().toLowerCase() : ''
                const optOutKeywords = Array.isArray(result.data?.optOutKeywords) ? result.data.optOutKeywords.map(String).map((v: string) => v.toLowerCase()) : ['stop']
                const optInKeywords = Array.isArray(result.data?.optInKeywords) ? result.data.optInKeywords.map(String).map((v: string) => v.toLowerCase()) : ['start']
                const organizationId = typeof result.data?.organizationId === 'string' ? result.data.organizationId : null
                if (organizationId && from && optOutKeywords.includes(text)) {
                  await supabase.rpc('whatsapp_set_consent', { p_secret: getMetaConfig().serverSecret, p_organization_id: organizationId, p_phone_number: from, p_opt_in: false, p_source: `keyword:${text}` })
                } else if (organizationId && from && optInKeywords.includes(text)) {
                  await supabase.rpc('whatsapp_set_consent', { p_secret: getMetaConfig().serverSecret, p_organization_id: organizationId, p_phone_number: from, p_opt_in: true, p_source: `keyword:${text}` })
                }
              } else if (item.kind === 'status' && phoneNumberId) {
                const timestamp = Number(item.item.timestamp || Math.floor(Date.now() / 1000)) * 1000
                const conversation = (item.item.conversation || {}) as Record<string, unknown>
                const pricing = (item.item.pricing || {}) as Record<string, unknown>
                const errors = Array.isArray(item.item.errors) ? item.item.errors[0] as Record<string, unknown> | undefined : undefined
                const result = await supabase.rpc('whatsapp_ingest_status', {
                  p_secret: getMetaConfig().serverSecret,
                  p_phone_number_id: phoneNumberId,
                  p_wa_message_id: waMessageId,
                  p_status: typeof item.item.status === 'string' ? item.item.status : 'sent',
                  p_timestamp: new Date(timestamp).toISOString(),
                  p_conversation_ref: typeof conversation.id === 'string' ? conversation.id : null,
                  p_origin: typeof conversation.origin === 'string' ? conversation.origin.type : null,
                  p_pricing_category: typeof pricing.category === 'string' ? pricing.category : null,
                  p_error_code: errors?.code != null ? String(errors.code) : null,
                  p_error_message: errors?.title != null ? String(errors.title) : null,
                  p_payload: item.item,
                })
                if (result.error) throw new Error(result.error.message)
              }
              await supabase.rpc('whatsapp_finish_webhook_event', { p_secret: getMetaConfig().serverSecret, p_event_key: eventKey, p_error: null })
            } catch (error) {
              await supabase.rpc('whatsapp_finish_webhook_event', { p_secret: getMetaConfig().serverSecret, p_event_key: eventKey, p_error: error instanceof Error ? error.message : 'Webhook processing failed' })
              throw error
            }
          }
        } else if (phoneNumberId || wabaId) {
          const result = await supabase.rpc('whatsapp_apply_account_event', {
            p_secret: getMetaConfig().serverSecret,
            p_field: field,
            p_waba_id: wabaId,
            p_phone_number_id: phoneNumberId,
            p_payload: value,
          })
          if (result.error) throw new Error(result.error.message)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('WhatsApp webhook processing failed', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
