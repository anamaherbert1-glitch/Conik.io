import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET || !process.env.LIVEKIT_URL) {
      return NextResponse.json({ error: 'Le service vidéo LiveKit n’est pas encore configuré.' }, { status: 503 })
    }
    const body = await request.json().catch(() => null) as { token?: string } | null
    if (!body?.token || body.token.length < 20 || body.token.length > 200) {
      return NextResponse.json({ error: 'Lien organisateur invalide.' }, { status: 400 })
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) return NextResponse.json({ error: 'Supabase serveur n’est pas configuré.' }, { status: 503 })

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const tokenHash = createHash('sha256').update(body.token).digest('hex')
    const { data, error } = await supabase.rpc('consume_live_cohost_invite', { p_token_hash: tokenHash })
    if (error) {
      const code = error.message.includes('INVALID_INVITE') ? 404 : error.message.includes('INVITE_EXPIRED') ? 410 : 409
      return NextResponse.json({ error: 'Ce lien organisateur est invalide, expiré ou déjà utilisé.' }, { status: code })
    }
    const live = Array.isArray(data) ? data[0] : data
    if (!live) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })

    const room = live.room_name
    const accessToken = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: `cohost-${crypto.randomUUID()}`,
      ttl: '4h',
    })
    accessToken.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true })
    return NextResponse.json({ token: await accessToken.toJwt(), url: process.env.LIVEKIT_URL, room, title: live.title })
  } catch {
    return NextResponse.json({ error: 'Impossible de rejoindre ce Live comme organisateur.' }, { status: 500 })
  }
}
