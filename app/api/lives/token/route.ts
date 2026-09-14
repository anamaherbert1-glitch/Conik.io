import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) return NextResponse.json({ error: 'Le service vidéo LiveKit n’est pas encore configuré.' }, { status: 503 })
  const body = await request.json().catch(() => null) as { slug?: string } | null
  const slug = String(body?.slug || '').trim().toLowerCase()
  if (!slug) return NextResponse.json({ error: 'Live introuvable.' }, { status: 400 })
  const supabase = await createClient()
  const cookieToken = request.cookies.get(`conik_live_${slug}`)?.value
  if (!cookieToken) return NextResponse.json({ error: 'Accès refusé.' }, { status: 401 })
  const { data: access, error } = await supabase.rpc('verify_live_access', { p_slug: slug, p_token: cookieToken })
  if (error || !access?.[0]) return NextResponse.json({ error: 'Accès refusé.' }, { status: 401 })
  const live = access[0]
  const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity: `guest-${crypto.randomUUID()}`, ttl: '2h' })
  token.addGrant({ roomJoin: true, room: live.stream_id || `conik-live-${live.live_id}`, canPublish: false, canSubscribe: true })
  return NextResponse.json({ token: await token.toJwt(), url: process.env.LIVEKIT_URL })
}
