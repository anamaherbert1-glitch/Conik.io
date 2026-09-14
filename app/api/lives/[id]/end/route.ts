import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Live invalide.' }, { status: 400 })
    const { data: live } = await supabase.from('live_events').select('id,status').eq('id', id).eq('organization_id', membership.organizationId).maybeSingle()
    if (!live) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })
    if (live.status === 'ended') return NextResponse.json({ ok: true })
    const { error } = await supabase.rpc('end_live_event', { p_live_id: id })
    if (error) return NextResponse.json({ error: 'Impossible de terminer le Live.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch { return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 }) }
}
