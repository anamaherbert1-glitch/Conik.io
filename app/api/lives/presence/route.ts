import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { slug?: string } | null
  const slug = String(body?.slug || '').trim().toLowerCase()
  const token = slug ? request.cookies.get(`conik_live_${slug}`)?.value : ''
  if (!slug || !token) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('mark_live_attendance', { p_slug: slug, p_token: token })
  if (error || !data?.[0]) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  return NextResponse.json({ ok: true, attendee: data[0] })
}

export async function GET(request: NextRequest) {
  const liveId = String(request.nextUrl.searchParams.get('live_id') || '').trim()
  if (!liveId) return NextResponse.json({ error: 'Live introuvable.' }, { status: 400 })
  try {
    const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
    const { data: live } = await supabase.from('live_events').select('id').eq('id', liveId).eq('organization_id', membership.organizationId).maybeSingle()
    if (!live) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })
    const { data, error } = await supabase.rpc('get_live_attendance', { p_live_id: liveId })
    if (error) return NextResponse.json({ error: 'Impossible de charger les participants.' }, { status: 500 })
    return NextResponse.json({ attendees: data || [] })
  } catch { return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 }) }
}
