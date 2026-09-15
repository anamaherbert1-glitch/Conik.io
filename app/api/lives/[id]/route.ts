import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Live invalide.' }, { status: 400 })
    const body = await request.json().catch(() => null) as { chat_enabled?: boolean } | null
    if (typeof body?.chat_enabled !== 'boolean') return NextResponse.json({ error: 'Valeur chat invalide.' }, { status: 400 })
    const { data: live, error: findError } = await supabase.from('live_events').select('id,organization_id,status,chat_enabled').eq('id', id).eq('organization_id', membership.organizationId).maybeSingle()
    if (findError) return NextResponse.json({ error: 'Impossible de vérifier le Live.' }, { status: 500 })
    if (!live) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })
    if (live.status === 'ended' || live.status === 'cancelled') return NextResponse.json({ error: 'Ce Live est terminé.' }, { status: 409 })
    const { data: updated, error } = await supabase.from('live_events').update({ chat_enabled: body.chat_enabled }).eq('id', id).eq('organization_id', membership.organizationId).select('id,chat_enabled').single()
    if (error) return NextResponse.json({ error: 'Impossible de modifier le chat.' }, { status: 500 })
    return NextResponse.json({ chat_enabled: updated.chat_enabled })
  } catch { return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 }) }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin'])
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Live invalide.' }, { status: 400 })
    const { data: live, error: findError } = await supabase.from('live_events').select('id,status,title').eq('id', id).eq('organization_id', membership.organizationId).maybeSingle()
    if (findError) return NextResponse.json({ error: 'Impossible de vérifier le Live.' }, { status: 500 })
    if (!live) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })
    if (live.status !== 'ended') return NextResponse.json({ error: 'Seuls les Lives terminés peuvent être supprimés.' }, { status: 409 })
    const { error: deleteError } = await supabase.from('live_events').delete().eq('id', id).eq('organization_id', membership.organizationId)
    if (deleteError) return NextResponse.json({ error: 'Impossible de supprimer ce Live.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 }) }
}
