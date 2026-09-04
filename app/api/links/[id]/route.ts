import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Lien introuvable.' }, { status: 400 })
  }
  const { error } = await supabase
    .from('links')
    .delete()
    .eq('id', id)
    .eq('organization_id', organization.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
