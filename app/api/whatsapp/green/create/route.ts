import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { encryptAccessToken } from '@/lib/whatsapp/meta'
import { createPartnerInstance, createWebhookToken, getGreenApiConfig, hashGreenWebhookToken } from '@/lib/whatsapp/green-api'

export const runtime = 'nodejs'

const clean = (value: unknown, max = 120) => typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null

export async function POST() {
  const { supabase, user, membership, organization } = await requireWorkspaceRole(['owner', 'admin'])

  const { data: existing, error: existingError } = await supabase
    .from('whatsapp_green_instances')
    .select('id,id_instance,status,instance_name,created_at')
    .eq('organization_id', membership.organizationId)
    .in('status', ['notAuthorized', 'authorized', 'starting', 'yellow'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
  if (existing) return NextResponse.json({ ok: true, reused: true, instance: existing })

  try {
    const config = getGreenApiConfig()
    const webhookToken = createWebhookToken()
    const appUrl = clean(process.env.NEXT_PUBLIC_APP_URL, 500)
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL is required for GREEN-API webhooks.')

    const name = `Conik - ${clean(organization?.name, 70) || membership.organizationId.slice(0, 8)}`
    const created = await createPartnerInstance({
      name,
      webhookUrl: `${appUrl.replace(/\/$/, '')}/api/whatsapp/green/webhook`,
      webhookUrlToken: webhookToken,
    })

    const { data: instanceId, error: saveError } = await supabase.rpc('green_api_create_instance_record', {
      p_organization_id: membership.organizationId,
      p_connection_id: null,
      p_id_instance: created.idInstance,
      p_api_url: created.apiUrl,
      p_media_url: created.mediaUrl || created.apiUrl,
      p_api_token_cipher: encryptAccessToken(created.apiTokenInstance),
      p_instance_name: name,
      p_created_by: user.id,
    })

    if (saveError) throw new Error(saveError.message)

    const { error: tokenError } = await supabase
      .from('whatsapp_green_instances')
      .update({ webhook_token_hash: hashGreenWebhookToken(webhookToken), metadata: { partner: true, webhookConfigured: true } })
      .eq('id', instanceId)
      .eq('organization_id', membership.organizationId)

    if (tokenError) throw new Error(tokenError.message)

    return NextResponse.json({
      ok: true,
      reused: false,
      instance: {
        id: instanceId,
        idInstance: created.idInstance,
        status: 'notAuthorized',
        instanceName: name,
        apiUrl: created.apiUrl,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('GREEN-API instance creation failed', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Création de l’instance GREEN-API impossible.' }, { status: 502 })
  }
}
