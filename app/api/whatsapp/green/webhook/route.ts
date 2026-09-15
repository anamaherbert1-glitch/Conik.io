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

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const rawBody = await request.text()

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const instanceData = payload.instanceData && typeof payload.instanceData === 'object'
    ? payload.instanceData as Record<string, unknown>
    : {}
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
  const eventKey = createHash('sha256')
    .update(`${idInstance}:${typeWebhook}:${timestamp}:${rawBody}`)
    .digest('hex')

  const { error: eventError } = await admin
    .from('whatsapp_webhook_events')
    .upsert({
      organization_id: instance.organization_id,
      connection_id: instance.connection_id,
      event_type: `green:${typeWebhook}`,
      event_key: eventKey,
      payload,
      processed: false,
    }, { onConflict: 'event_key', ignoreDuplicates: true })

  if (eventError) console.error('GREEN-API webhook event storage failed', eventError)

  if (typeWebhook === 'statusInstanceChanged') {
    const statusValue = typeof payload.statusInstance === 'string' ? payload.statusInstance : 'unknown'
    const status = statusMap[statusValue] || 'unknown'
    const wid = typeof instanceData.wid === 'string' ? instanceData.wid : null

    const { error: statusError } = await admin
      .from('whatsapp_green_instances')
      .update({
        status,
        wid: wid || undefined,
        last_synced_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', instance.id)

    if (statusError) console.error('GREEN-API status update failed', statusError)
  }

  return NextResponse.json({ ok: true })
}
