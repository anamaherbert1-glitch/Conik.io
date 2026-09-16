import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const key = process.env.LIVEKIT_API_KEY
  const secret = process.env.LIVEKIT_API_SECRET
  const url = process.env.LIVEKIT_URL
  if (!key || !secret || !url) {
    return NextResponse.json(
      {
        error:
          'LiveKit n’est pas configuré. Ajoutez LIVEKIT_URL, LIVEKIT_API_KEY et LIVEKIT_API_SECRET dans les variables d’environnement Vercel, puis redéployez.',
      },
      { status: 503 },
    )
  }

  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Live invalide.' }, { status: 400 })

  const { data: live, error } = await supabase
    .from('live_events')
    .select('id,title,stream_id,status')
    .eq('id', id)
    .eq('organization_id', membership.organizationId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!live) return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })
  if (live.status === 'cancelled') return NextResponse.json({ error: 'Ce Live est annulé.' }, { status: 409 })
  if (live.status === 'ended') return NextResponse.json({ error: 'Ce Live est terminé.' }, { status: 409 })

  const room = live.stream_id || `conik-live-${live.id}`
  const updates: Record<string, string> = {
    stream_provider: 'livekit',
    stream_id: room,
    status: 'live',
  }
  const { error: updateError } = await supabase
    .from('live_events')
    .update(updates)
    .eq('id', live.id)
    .eq('organization_id', membership.organizationId)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Identité stable pour l’organisateur (évite de perdre la piste à chaque refresh)
  const identity = `host-${membership.userId}`
  const token = new AccessToken(key, secret, {
    identity,
    name: 'Organisateur',
    ttl: '6h',
  })
  token.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })

  return NextResponse.json({
    token: await token.toJwt(),
    url,
    room,
    title: live.title,
  })
}
