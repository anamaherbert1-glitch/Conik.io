import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, membership, user } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'Live invalide.' }, { status: 400 })
    }

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
      return NextResponse.json(
        { error: 'Ce Live est terminé : impossible de créer un lien organisateur.' },
        { status: 422 },
      )
    }

    const token = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const origin = new URL(request.url).origin

    // 1) RPC (si présente et correctement configurée)
    const { data, error } = await supabase.rpc('create_live_cohost_invite', {
      p_live_id: id,
      p_organization_id: membership.organizationId,
      p_token_hash: tokenHash,
      p_expires_at: expiresAt,
    })

    if (!error) {
      const row = Array.isArray(data) ? data[0] : data
      if (row?.id) {
        return NextResponse.json({
          link: `${origin}/live/cohost/${encodeURIComponent(token)}`,
          expires_at: row.expires_at || expiresAt,
        })
      }
    }

    // 2) Insertion via service role (contourne RLS) après vérif d’autorisation ci-dessus
    try {
      const admin = createAdminClient()
      const { data: inserted, error: insertError } = await admin
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
        if (/relation .*live_cohost_invites.* does not exist/i.test(detail)) {
          return NextResponse.json(
            {
              error:
                'La table des invitations organisateur n’est pas installée. Appliquez la migration live_cohost_invites dans Supabase.',
            },
            { status: 500 },
          )
        }
        return NextResponse.json(
          { error: detail || 'Impossible de créer le lien organisateur.' },
          { status: 500 },
        )
      }

      return NextResponse.json({
        link: `${origin}/live/cohost/${encodeURIComponent(token)}`,
        expires_at: inserted.expires_at,
      })
    } catch (adminErr) {
      const msg =
        adminErr instanceof Error
          ? adminErr.message
          : 'Impossible de créer le lien organisateur (clé service manquante ou RLS).'
      // Dernier recours : insert utilisateur + message clair
      const { data: fallback, error: fbError } = await supabase
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

      if (fbError || !fallback) {
        return NextResponse.json(
          {
            error:
              fbError?.message ||
              msg ||
              'Violation RLS : appliquez supabase/migrations/20260915220000_live_cohost_invites_rls.sql dans Supabase.',
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        link: `${origin}/live/cohost/${encodeURIComponent(token)}`,
        expires_at: fallback.expires_at,
      })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Non autorisé.'
    return NextResponse.json({ error: msg }, { status: 401 })
  }
}
