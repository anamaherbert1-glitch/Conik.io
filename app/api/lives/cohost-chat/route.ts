import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

async function resolveInvite(token: string) {
  if (!token || token.length < 20 || token.length > 200) return null
  const admin = createAdminClient()
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const { data: invite } = await admin
    .from('live_cohost_invites')
    .select('live_id,organization_id,expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (!invite || new Date(invite.expires_at).getTime() <= Date.now()) return null
  const { data: live } = await admin
    .from('live_events')
    .select('id,organization_id,status,chat_enabled')
    .eq('id', invite.live_id)
    .eq('organization_id', invite.organization_id)
    .maybeSingle()
  if (!live || live.status === 'ended' || live.status === 'cancelled') return null
  return { invite, live }
}

export async function GET(request: NextRequest) {
  try {
    const token = String(request.nextUrl.searchParams.get('token') || '')
    const resolved = await resolveInvite(token)
    if (!resolved) return NextResponse.json({ error: 'Lien organisateur invalide ou expiré.' }, { status: 403 })
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('live_event_messages')
      .select('id,sender_type,sender_email,message,created_at')
      .eq('live_event_id', resolved.live.id)
      .order('created_at', { ascending: true })
      .limit(200)
    if (error) return NextResponse.json({ error: 'Impossible de charger le chat.' }, { status: 500 })
    return NextResponse.json({ messages: data || [], chat_enabled: resolved.live.chat_enabled !== false })
  } catch {
    return NextResponse.json({ error: 'Impossible de charger le chat.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as { token?: string; message?: string } | null
    const token = String(body?.token || '')
    const message = String(body?.message || '').trim()
    if (!message || message.length > 1000) return NextResponse.json({ error: 'Message invalide.' }, { status: 400 })
    const resolved = await resolveInvite(token)
    if (!resolved) return NextResponse.json({ error: 'Lien organisateur invalide ou expiré.' }, { status: 403 })
    if (resolved.live.chat_enabled === false) return NextResponse.json({ error: 'Le chat a été désactivé par l’organisateur.' }, { status: 403 })
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('live_event_messages')
      .insert({
        live_event_id: resolved.live.id,
        organization_id: resolved.live.organization_id,
        sender_type: 'host',
        sender_email: 'Co-organisateur',
        message,
      })
      .select('id,sender_type,sender_email,message,created_at')
      .single()
    if (error) return NextResponse.json({ error: 'Impossible d’envoyer le message.' }, { status: 500 })
    return NextResponse.json({ message: data })
  } catch {
    return NextResponse.json({ error: 'Impossible d’envoyer le message.' }, { status: 500 })
  }
}
