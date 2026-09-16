import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

export async function GET() {
  const { supabase, membership } = await requireWorkspaceRole(['owner','admin','editor','viewer'])
  const { data, error } = await supabase.rpc('conik_get_subscription_status', { p_organization_id: membership.organizationId })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const row = Array.isArray(data) ? data[0] : data
  return NextResponse.json({ ok: true, subscription: row || { active:false, whatsapp_active:false } })
}
