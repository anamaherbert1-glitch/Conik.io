import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export async function GET(request: NextRequest) {
  const liveId = String(request.nextUrl.searchParams.get('live_id') || '').trim()
  if (liveId) {
    try {
      const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
      const { data: live } = await supabase.from('live_events').select('id,organization_id').eq('id', liveId).eq('organization_id', membership.organizationId).maybeSingle()
      if (!live) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })
      const { data, error } = await supabase.from('live_event_messages').select('id,sender_type,sender_email,message,created_at').eq('live_event_id', live.id).order('created_at', { ascending: true }).limit(200)
      if (error) return NextResponse.json({ error: 'Impossible de charger le chat.' }, { status: 500 })
      return NextResponse.json({ messages: data || [] })
    } catch { return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 }) }
  }
  const slug = String(request.nextUrl.searchParams.get('slug') || '').trim().toLowerCase()
  const token = request.cookies.get(`conik_live_${slug}`)?.value
  if (!slug || !token) return NextResponse.json({ messages: [] })
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_live_chat', { p_slug: slug, p_token: token })
  if (error) return NextResponse.json({ error: 'Impossible de charger le chat.' }, { status: 500 })
  return NextResponse.json({ messages: data || [] })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { slug?: string; message?: string; live_id?: string } | null
  const message = String(body?.message || '').trim()
  if (!message || message.length > 1000) return NextResponse.json({ error: 'Message invalide.' }, { status: 400 })
  if (body?.live_id) {
    try {
      const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
      const { data: live } = await supabase.from('live_events').select('id,organization_id,status').eq('id', body.live_id).eq('organization_id', membership.organizationId).maybeSingle()
      if (!live) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })
      if (live.status === 'ended' || live.status === 'cancelled') return NextResponse.json({ error: 'Ce Live est terminé.' }, { status: 409 })
      const { data: user } = await supabase.auth.getUser()
      const { data, error } = await supabase.from('live_event_messages').insert({ live_event_id: live.id, organization_id: live.organization_id, sender_type: 'host', sender_email: user.user?.email || null, message }).select('id,sender_type,sender_email,message,created_at').single()
      if (error) return NextResponse.json({ error: 'Impossible d’envoyer le message.' }, { status: 500 })
      return NextResponse.json({ message: data })
    } catch { return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 }) }
  }
  const slug = String(body?.slug || '').trim().toLowerCase()
  const token = request.cookies.get(`conik_live_${slug}`)?.value
  if (!slug || !token) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('send_live_chat', { p_slug: slug, p_token: token, p_message: message })
  if (error) return NextResponse.json({ error: error.message === 'ACCESS_DENIED' ? 'Accès refusé.' : 'Impossible d’envoyer le message.' }, { status: error.message === 'ACCESS_DENIED' ? 403 : 500 })
  return NextResponse.json({ message: data?.[0] || null })
}
