import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, membership, user } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Live invalide.' }, { status: 400 })
    }

    // Vérifier que le Live appartient à l’organisation et n’est pas terminé
    const { data: live, error: liveError } = await supabase
      .from('live_events')
      .select('id,status,organization_id')
      .eq('id', id)
      .eq('organization_id', membership.organizationId)
      .maybeSingle()

    if (liveError) {
      return NextResponse.json({ error: liveError.message }, { status: 500 })
    }
    if (!live) {
      return NextResponse.json({ error: 'Live introuvable.' }, { status: 404 })
    }
    if (live.status === 'ended' || live.status === 'cancelled') {
      return NextResponse.json({ error: 'Ce Live est terminé : impossible de créer un lien organisateur.' }, { status: 422 })
    }

    const token = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // 1) Essayer la RPC sécurisée
    const { data, error } = await supabase.rpc('create_live_cohost_invite', {
      p_live_id: id,
      p_organization_id: membership.organizationId,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    })

    if (!error) {
      const row = Array.isArray(data) ? data[0] : data
      if (row) {
        const origin = new URL(request.url).origin
        return NextResponse.json({
          link: `${origin}/live/cohost/${encodeURIComponent(token)}`,
          expires_at: row.expires_at || expiresAt,
        })
      }
    }

    // 2) Fallback : insertion directe si la RPC n’existe pas encore en base
    const { data: inserted, error: insertError } = await supabase
      .from('live_cohost_invites')
      .insert({
        live_id: id,
        organization_id: membership.organizationId,
        token_hash: tokenHash,
        created_by: user?.id || null,
        expires_at: expiresAt,
      })
      .select('id,expires_at')
      .single()

    if (insertError) {
      const detail = insertError.message || error?.message || ''
      // Table manquante → migration non appliquée
      if (/relation .*live_cohost_invites.* does not exist|function .*create_live_cohost_invite/i.test(detail)) {
        return NextResponse.json(
          {
            error:
              'La table des invitations organisateur n’est pas encore installée en base. Appliquez la migration supabase/migrations/20260915090000_live_cohost_invites.sql puis réessayez.',
          },
          { status: 500 },
        )
      }
      return NextResponse.json(
        { error: detail || 'Impossible de créer le lien organisateur.' },
        { status: 500 },
      )
    }

    const origin = new URL(request.url).origin
    return NextResponse.json({
      link: `${origin}/live/cohost/${encodeURIComponent(token)}`,
      expires_at: inserted.expires_at,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Non autorisé.'
    return NextResponse.json({ error: msg }, { status: 401 })
  }
}
