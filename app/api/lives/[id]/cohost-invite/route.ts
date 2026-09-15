import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const runtime = 'nodejs'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Live invalide.' }, { status: 400 })
    const token = randomBytes(32).toString('base64url')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const { data, error } = await supabase.rpc('create_live_cohost_invite', {
      p_live_id: id,
      p_organization_id: membership.organizationId,
      p_token_hash: tokenHash,
      p_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    if (error) return NextResponse.json({ error: 'Impossible de créer le lien organisateur.' }, { status: 500 })
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return NextResponse.json({ error: 'Invitation invalide.' }, { status: 500 })
    return NextResponse.json({ link: `${new URL(request.url).origin}/live/cohost/${encodeURIComponent(token)}`, expires_at: row.expires_at })
  } catch {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }
}
