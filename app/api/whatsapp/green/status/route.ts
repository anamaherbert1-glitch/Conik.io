import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { decryptAccessToken } from '@/lib/whatsapp/meta'
import { getInstanceState } from '@/lib/whatsapp/green-api'

export const runtime = 'nodejs'

export async function GET() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin'])

  const { data: instance, error } = await supabase
    .from('whatsapp_green_instances')
    .select('id,id_instance,api_url,status,wid,instance_name,last_synced_at,last_error,created_at,updated_at,api_token_cipher')
    .eq('organization_id', membership.organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!instance) return NextResponse.json({ ok: true, connected: false, instance: null })

  try {
    const state = await getInstanceState({
      apiUrl: instance.api_url,
      idInstance: instance.id_instance,
      apiTokenInstance: decryptAccessToken(instance.api_token_cipher),
    })

    const rawState = state.stateInstance || 'unknown'
    const status = rawState === 'yellowCard' ? 'yellow' : rawState === 'suspended' ? 'red' : ['notAuthorized', 'authorized', 'blocked', 'starting'].includes(rawState) ? rawState : 'unknown'

    await supabase
      .from('whatsapp_green_instances')
      .update({ status, last_synced_at: new Date().toISOString(), last_error: null })
      .eq('id', instance.id)
      .eq('organization_id', membership.organizationId)

    return NextResponse.json({
      ok: true,
      connected: status === 'authorized',
      instance: {
        id: instance.id,
        idInstance: instance.id_instance,
        status,
        wid: instance.wid,
        instanceName: instance.instance_name,
        lastSyncedAt: new Date().toISOString(),
        createdAt: instance.created_at,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossible de récupérer le statut GREEN-API.'
    await supabase
      .from('whatsapp_green_instances')
      .update({ last_synced_at: new Date().toISOString(), last_error: message })
      .eq('id', instance.id)
      .eq('organization_id', membership.organizationId)

    return NextResponse.json({
      ok: false,
      error: message,
      instance: {
        id: instance.id,
        idInstance: instance.id_instance,
        status: instance.status,
        wid: instance.wid,
        instanceName: instance.instance_name,
      },
    }, { status: 502 })
  }
}
