import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

export async function GET() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const [{ data: connections, error: connectionError }, { data: quota, error: quotaError }, { data: stats, error: statsError }] = await Promise.all([
    supabase.from('whatsapp_connections').select('id,waba_id,phone_number_id,business_id,display_phone_number,verified_name,status,quality_rating,platform_type,token_expires_at,connected_at,disconnected_at,last_synced_at,last_error,metadata').eq('organization_id', membership.organizationId).order('connected_at', { ascending: false }),
    supabase.rpc('whatsapp_quota', { p_organization_id: membership.organizationId }),
    supabase.rpc('whatsapp_stats', { p_organization_id: membership.organizationId, p_days: 30 }),
  ])

  if (connectionError) return NextResponse.json({ error: connectionError.message }, { status: 500 })
  if (quotaError) return NextResponse.json({ error: quotaError.message }, { status: 500 })
  if (statsError) return NextResponse.json({ error: statsError.message }, { status: 500 })

  return NextResponse.json({ connections: connections || [], quota, stats })
}

export async function DELETE(request: Request) {
  const { supabase } = await requireWorkspaceRole(['owner', 'admin'])
  const body = await request.json().catch(() => null)
  const connectionId = typeof body?.connectionId === 'string' ? body.connectionId : null
  if (!connectionId) return NextResponse.json({ error: 'connectionId obligatoire.' }, { status: 400 })

  const { error } = await supabase.rpc('whatsapp_disconnect', { p_connection_id: connectionId })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
