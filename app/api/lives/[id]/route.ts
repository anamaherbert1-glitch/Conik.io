import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin'])
    const { id } = await params

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Live invalide.' }, { status: 400 })
    }

    const { data: live, error: findError } = await supabase
      .from('live_events')
      .select('id,status,title')
      .eq('id', id)
      .eq('organization_id', membership.organizationId)
      .maybeSingle()

    if (findError) return NextResponse.json({ error: 'Impossible de vérifier le Live.' }, { status: 500 })
    if (!live) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })

    if (live.status !== 'ended') {
      return NextResponse.json({ error: 'Seuls les Lives terminés peuvent être supprimés.' }, { status: 409 })
    }

    const { error: deleteError } = await supabase
      .from('live_events')
      .delete()
      .eq('id', id)
      .eq('organization_id', membership.organizationId)

    if (deleteError) return NextResponse.json({ error: 'Impossible de supprimer ce Live.' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
}
