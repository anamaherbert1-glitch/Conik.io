import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashGreenWebhookToken } from '@/lib/whatsapp/green-api'

export const runtime = 'nodejs'

const statusMap: Record<string, string> = {
  online: 'authorized',
  offline: 'notAuthorized',
  authorized: 'authorized',
  notAuthorized: 'notAuthorized',
  blocked: 'blocked',
  starting: 'starting',
  yellow: 'yellow',
  yellowCard: 'yellow',
  red: 'red',
  suspended: 'red',
}

const object = (value: unknown) => value && typeof value === 'object' ? value as Record<string, unknown> : {}
const stringValue = (value: unknown) => typeof value === 'string' ? value : ''

function messageContent(messageData: Record<string, unknown>) {
  const type = stringValue(messageData.typeMessage)
  if (type === 'textMessage') return stringValue(object(messageData.textMessageData).text)
  if (type === 'extendedTextMessage') return stringValue(object(messageData.extendedTextMessageData).text)
  if (type === 'quotedMessage') {
    const quoted = object(messageData.quotedMessage)
    return stringValue(object(quoted.textMessageData).text) || stringValue(object(quoted.extendedTextMessageData).text)
  }
  const media = object(messageData.fileMessageData)
  return stringValue(media.caption) || stringValue(media.fileName) || type || 'WhatsApp message'
}

function phoneFromChatId(chatId: string) {
  return chatId.replace(/@c\.us$/i, '').replace(/\D/g, '')
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const rawBody = await request.text()

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const instanceData = object(payload.instanceData)
  const idInstance = instanceData.idInstance != null ? String(instanceData.idInstance) : ''
  if (!idInstance) return NextResponse.json({ error: 'Missing instanceData.idInstance' }, { status: 400 })

  const admin = createAdminClient()
  const { data: instance, error: lookupError } = await admin
    .from('whatsapp_green_instances')
    .select('id,organization_id,connection_id,webhook_token_hash,status')
    .eq('id_instance', idInstance)
    .maybeSingle()

  if (lookupError) return NextResponse.json({ error: 'Webhook lookup failed' }, { status: 500 })
  if (!instance || !instance.webhook_token_hash) return NextResponse.json({ error: 'Unknown instance' }, { status: 404 })

  if (hashGreenWebhookToken(authorization.replace(/^Bearer\s+/i, '').trim()) !== instance.webhook_token_hash) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const timestamp = payload.timestamp != null ? String(payload.timestamp) : String(Math.floor(Date.now() / 1000))
  const typeWebhook = typeof payload.typeWebhook === 'string' ? payload.typeWebhook : 'unknown'
  const eventKey = createHash('sha256').update(`${idInstance}:${typeWebhook}:${timestamp}:${rawBody}`).digest('hex')

  const { data: storedEvent, error: eventError } = await admin
    .from('whatsapp_webhook_events')
    .upsert({
      organization_id: instance.organization_id,
      connection_id: instance.connection_id,
      event_type: `green:${typeWebhook}`,
      event_key: eventKey,
      payload,
      processed: false,
    }, { onConflict: 'event_key', ignoreDuplicates: true })
    .select('id')
    .maybeSingle()

  if (eventError) console.error('GREEN-API webhook event storage failed', eventError)

  if (typeWebhook === 'statusInstanceChanged') {
    const statusValue = typeof payload.statusInstance === 'string' ? payload.statusInstance : 'unknown'
    const status = statusMap[statusValue] || 'unknown'
    const wid = typeof instanceData.wid === 'string' ? instanceData.wid : null
    const { error: statusError } = await admin.from('whatsapp_green_instances').update({ status, wid: wid || undefined, last_synced_at: new Date().toISOString(), last_error: null }).eq('id', instance.id)
    if (statusError) console.error('GREEN-API status update failed', statusError)
  }

  if (typeWebhook === 'incomingMessageReceived' || typeWebhook === 'outgoingMessageReceived' || typeWebhook === 'outgoingAPIMessageReceived') {
    const senderData = object(payload.senderData)
    const messageData = object(payload.messageData)
    const chatId = stringValue(senderData.chatId) || stringValue(senderData.sender)
    const phone = phoneFromChatId(chatId)
    const senderName = stringValue(senderData.senderName) || stringValue(senderData.senderContactName) || stringValue(senderData.chatName)
    const idMessage = stringValue(payload.idMessage) || null
    const occurredAt = Number(payload.timestamp)
    const messageAt = Number.isFinite(occurredAt) && occurredAt > 0 ? new Date(occurredAt * 1000).toISOString() : new Date().toISOString()
    const direction = typeWebhook === 'incomingMessageReceived' ? 'inbound' : 'outbound'

    if (phone && idMessage) {
      const { data: duplicate } = await admin
        .from('whatsapp_messages')
        .select('id')
        .eq('organization_id', instance.organization_id)
        .eq('wa_message_id', idMessage)
        .maybeSingle()

      if (!duplicate) {
        let { data: contact } = await admin.from('contacts').select('id,first_name,last_name,phone,whatsapp_number').eq('organization_id', instance.organization_id).or(`whatsapp_number.eq.${phone},phone.eq.${phone}`).limit(1).maybeSingle()

        if (!contact) {
          const parts = senderName.trim().split(/\s+/).filter(Boolean)
          const { data: created } = await admin.from('contacts').insert({
            organization_id: instance.organization_id,
            first_name: parts[0] || null,
            last_name: parts.slice(1).join(' ') || null,
            phone,
            whatsapp_number: phone,
            status: 'lead',
            consent_status: 'unknown',
            custom_fields: {},
            last_activity_at: messageAt,
          }).select('id,first_name,last_name,phone,whatsapp_number').single()
          contact = created
        } else {
          await admin.from('contacts').update({ whatsapp_number: phone, last_activity_at: messageAt }).eq('id', contact.id)
        }

        if (contact) {
          const { data: waContact } = await admin.from('whatsapp_contacts').upsert({
            organization_id: instance.organization_id,
            connection_id: null,
            contact_id: contact.id,
            phone_number: phone,
            wa_id: chatId || `${phone}@c.us`,
            name: senderName || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || null,
            last_inbound_at: direction === 'inbound' ? messageAt : undefined,
            last_outbound_at: direction === 'outbound' ? messageAt : undefined,
            updated_at: messageAt,
          }, { onConflict: 'organization_id,phone_number' }).select('id,contact_id').single()

          if (waContact) {
            let { data: conversation } = await admin.from('whatsapp_conversations').select('id,unread_count').eq('organization_id', instance.organization_id).eq('whatsapp_contact_id', waContact.id).is('connection_id', null).maybeSingle()
            if (!conversation) {
              const { data: createdConversation } = await admin.from('whatsapp_conversations').insert({
                organization_id: instance.organization_id,
                connection_id: null,
                contact_id: contact.id,
                whatsapp_contact_id: waContact.id,
                wa_conversation_id: chatId || `${phone}@c.us`,
                origin: direction === 'inbound' ? 'user_initiated' : 'business_initiated',
                status: 'open',
                last_message_at: messageAt,
                last_inbound_at: direction === 'inbound' ? messageAt : null,
                started_at: messageAt,
                unread_count: direction === 'inbound' ? 1 : 0,
              }).select('id,unread_count').single()
              conversation = createdConversation
            } else {
              await admin.from('whatsapp_conversations').update({
                last_message_at: messageAt,
                last_inbound_at: direction === 'inbound' ? messageAt : undefined,
                unread_count: direction === 'inbound' ? (conversation.unread_count || 0) + 1 : conversation.unread_count,
                status: 'open',
                updated_at: messageAt,
              }).eq('id', conversation.id)
            }

            if (conversation) {
              const { error: messageError } = await admin.from('whatsapp_messages').insert({
                organization_id: instance.organization_id,
                connection_id: null,
                conversation_id: conversation.id,
                contact_id: contact.id,
                direction,
                message_type: stringValue(messageData.typeMessage) || 'text',
                wa_message_id: idMessage,
                status: direction === 'inbound' ? 'received' : 'sent',
                content: messageContent(messageData),
                payload,
                sent_at: direction === 'outbound' ? messageAt : null,
              })
              if (messageError) console.error('GREEN-API message persistence failed', messageError)
            }
          }
        }
      }
    }
  }

  if (storedEvent?.id) await admin.from('whatsapp_webhook_events').update({ processed: true, processed_at: new Date().toISOString() }).eq('id', storedEvent.id)
  return NextResponse.json({ ok: true })
}
