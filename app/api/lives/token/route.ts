import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const key = process.env.LIVEKIT_API_KEY
  const secret = process.env.LIVEKIT_API_SECRET
  const url = process.env.LIVEKIT_URL
  if (!key || !secret || !url) {
    return NextResponse.json(
      {
        error:
          'LiveKit n’est pas configuré. Ajoutez LIVEKIT_URL, LIVEKIT_API_KEY et LIVEKIT_API_SECRET sur Vercel.',
      },
      { status: 503 },
    )
  }

  const body = (await request.json().catch(() => null)) as { slug?: string } | null
  const slug = String(body?.slug || '')
    .trim()
    .toLowerCase()
  if (!slug) return NextResponse.json({ error: 'Live introuvable.' }, { status: 400 })

  const supabase = await createClient()
  const cookieToken = request.cookies.get(`conik_live_${slug}`)?.value
  if (!cookieToken) return NextResponse.json({ error: 'Accès refusé. Demandez d’abord l’accès au Live.' }, { status: 401 })

  const { data: access, error } = await supabase.rpc('verify_live_access', {
    p_slug: slug,
    p_token: cookieToken,
  })
  if (error || !access?.[0]) return NextResponse.json({ error: 'Accès refusé ou session expirée.' }, { status: 401 })

  const live = access[0]
  const room = live.stream_id || `conik-live-${live.live_id}`
  const token = new AccessToken(key, secret, {
    identity: `guest-${crypto.randomUUID()}`,
    name: 'Spectateur',
    ttl: '3h',
  })
  token.addGrant({
    roomJoin: true,
    room,
    canPublish: false,
    canSubscribe: true,
    canPublishData: false,
  })

  return NextResponse.json({ token: await token.toJwt(), url, room })
}
