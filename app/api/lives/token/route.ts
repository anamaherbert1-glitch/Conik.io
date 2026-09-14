import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

function configError() {
  return NextResponse.json({ error: 'Le service vidéo LiveKit n’est pas encore configuré.' }, { status: 503 })
}

function roomName(id: string) {
  return `conik-live-${id}`
}

export async function POST(request: NextRequest) {
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) return configError()

  const body = await request.json().catch(() => null) as { slug?: string } | null
  const slug = String(body?.slug || '').trim().toLowerCase()
  if (!slug) return NextResponse.json({ error: 'Live introuvable.' }, { status: 400 })

  const supabase = await createClient()
  const cookieToken = request.cookies.get(`conik_live_${slug}`)?.value
  if (!cookieToken) return NextResponse.json({ error: 'Accès refusé.' }, { status: 401 })

  const { data: access, error } = await supabase.rpc('verify_live_access', { p_slug: slug, p_token: cookieToken })
  if (error || !access?.[0]) return NextResponse.json({ error: 'Accès refusé.' }, { status: 401 })

  const live = access[0]
  const identity = `guest-${crypto.randomUUID()}`
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity,
    ttl: '2h',
  })
  token.addGrant({ roomJoin: true, room: live.stream_id || roomName(live.live_id), canPublish: false, canSubscribe: true })

  return NextResponse.json({ token: await token.toJwt(), url: process.env.LIVEKIT_URL })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) return configError()

  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Live invalide.' }, { status: 400 })

  const { data: live, error } = await supabase
    .from('live_events')
    .select('id,title,stream_id')
    .eq('id', id)
    .eq('organization_id', membership.organizationId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!live) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })

  const room = live.stream_id || roomName(live.id)
  if (!live.stream_id) {
    const { error: updateError } = await supabase.from('live_events').update({ stream_provider: 'livekit', stream_id: room }).eq('id', live.id).eq('organization_id', membership.organizationId)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const identity = `host-${crypto.randomUUID()}`
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity, ttl: '4h' })
  token.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true })

  return NextResponse.json({ token: await token.toJwt(), url: process.env.LIVEKIT_URL, room, title: live.title })
}
