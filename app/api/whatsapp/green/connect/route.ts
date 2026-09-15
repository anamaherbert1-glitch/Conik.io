import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { encryptAccessToken } from '@/lib/whatsapp/meta'
import {
  configureInstanceWebhook,
  createWebhookToken,
  getInstanceState,
  hashGreenWebhookToken,
  normalizeGreenApiCredentials,
} from '@/lib/whatsapp/green-api'

export const runtime = 'nodejs'

const clean = (value: unknown, max = 120) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : ''

export async function POST(request: Request) {
  const { supabase, user, membership, organization } = await requireWorkspaceRole(['owner', 'admin'])

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const credentials = normalizeGreenApiCredentials({
      idInstance: clean(body.idInstance, 30),
      apiTokenInstance: clean(body.apiTokenInstance, 300),
      apiUrl: clean(body.apiUrl, 500),
    })

    const state = await getInstanceState(credentials)
    const rawState = state.stateInstance || 'unknown'
    if (!['notAuthorized', 'authorized', 'blocked', 'starting', 'yellowCard', 'suspended'].includes(rawState)) {
      throw new Error(`GREEN-API a retourné un statut inattendu: ${rawState}`)
    }

    const appUrl = clean(process.env.NEXT_PUBLIC_APP_URL, 500)
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL est requis pour le webhook GREEN-API.')

    const webhookToken = createWebhookToken()
    await configureInstanceWebhook({
      ...credentials,
      webhookUrl: `${appUrl.replace(/\/$/, '')}/api/whatsapp/green/webhook`,
      webhookUrlToken: webhookToken,
    })

    const name = clean(body.instanceName, 100) || `WhatsApp - ${clean(organization?.name, 60) || membership.organizationId.slice(0, 8)}`
    const status = rawState === 'yellowCard' ? 'yellow' : rawState === 'suspended' ? 'red' : rawState

    const { data: instanceId, error } = await supabase.rpc('green_api_connect_instance', {
      p_organization_id: membership.organizationId,
      p_id_instance: credentials.idInstance,
      p_api_url: credentials.apiUrl,
      p_media_url: credentials.apiUrl,
      p_api_token_cipher: encryptAccessToken(credentials.apiTokenInstance),
      p_instance_name: name,
      p_webhook_token_hash: hashGreenWebhookToken(webhookToken),
      p_created_by: user.id,
    })

    if (error) throw new Error(error.message)

    await supabase
      .from('whatsapp_green_instances')
      .update({ status, last_synced_at: new Date().toISOString(), last_error: null })
      .eq('id', instanceId)
      .eq('organization_id', membership.organizationId)

    return NextResponse.json({
      ok: true,
      mode: 'manual',
      instance: {
        id: instanceId,
        idInstance: credentials.idInstance,
        status,
        instanceName: name,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('GREEN-API manual connection failed', error)
    const message = error instanceof Error ? error.message : 'Connexion GREEN-API impossible.'
    const status = message === 'INSTANCE_ALREADY_LINKED' ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
