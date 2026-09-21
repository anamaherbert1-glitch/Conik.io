import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth/require-user'

export async function POST(request: Request) {
  try {
    const { user } = await requireUser()
    const body = await request.json().catch(() => ({}))
    const inviteId = typeof body.inviteId === 'string' ? body.inviteId : ''
    if (!inviteId) return NextResponse.json({ error: 'Invitation introuvable.' }, { status: 400 })

    const admin = createAdminClient()
    const { data: invite, error: inviteError } = await admin
      .from('organization_invites')
      .select('id,organization_id,email,role,status,created_at')
      .eq('id', inviteId)
      .maybeSingle()

    if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 400 })
    if (!invite) return NextResponse.json({ error: 'Cette invitation n’existe plus.' }, { status: 404 })
    if (invite.status !== 'pending') return NextResponse.json({ error: 'Cette invitation a déjà été utilisée ou annulée.' }, { status: 409 })
    if (!user.email || user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json({ error: 'Cette invitation est destinée à une autre adresse e-mail.' }, { status: 403 })
    }

    const { data: existing } = await admin
      .from('organization_members')
      .select('id,role')
      .eq('organization_id', invite.organization_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!existing) {
      const { error: memberError } = await admin.from('organization_members').insert({
        organization_id: invite.organization_id,
        user_id: user.id,
        role: invite.role,
      })
      if (memberError) return NextResponse.json({ error: memberError.message }, { status: 400 })
    }

    const { error: updateError } = await admin
      .from('organization_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id)
      .eq('status', 'pending')
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

    return NextResponse.json({ ok: true, organizationId: invite.organization_id })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Impossible d’accepter l’invitation.' }, { status: 500 })
  }
}
