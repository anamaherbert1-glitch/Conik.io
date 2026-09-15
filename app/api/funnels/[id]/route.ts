import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin'])
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Tunnel invalide.' }, { status: 400 })

  const { data: funnel, error: findError } = await supabase
    .from('funnels')
    .select('id')
    .eq('id', id)
    .eq('organization_id', organization.id)
    .maybeSingle()

  if (findError) return NextResponse.json({ error: findError.message }, { status: 500 })
  if (!funnel) return NextResponse.json({ error: 'Tunnel introuvable.' }, { status: 404 })

  const { error } = await supabase
    .from('funnels')
    .delete()
    .eq('id', id)
    .eq('organization_id', organization.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
