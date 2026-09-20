import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']).default('editor'),
})

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://conik-io.vercel.app').replace(/\/$/, '')

async function sendInviteEmail(opts: {
  to: string
  inviterName: string
  orgName: string
  role: string
  acceptUrl: string
}) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'Conik <onboarding@resend.dev>'
  const roleLabel =
    opts.role === 'admin' ? 'Administrateur' : opts.role === 'viewer' ? 'Lecteur' : 'Éditeur'

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f1220;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1220;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#161a2b;border-radius:16px;border:1px solid #2a3148;overflow:hidden">
        <tr><td style="padding:28px 28px 8px">
          <div style="width:36px;height:36px;border-radius:10px;background:#5b5cf0;color:#fff;font-weight:800;text-align:center;line-height:36px">C</div>
          <h1 style="color:#fff;font-size:22px;margin:18px 0 8px">Vous êtes invité sur Conik</h1>
          <p style="color:#a8b0c8;font-size:15px;line-height:1.55;margin:0 0 12px">
            <strong style="color:#fff">${opts.inviterName}</strong> vous invite à collaborer sur l’espace
            <strong style="color:#fff">${opts.orgName}</strong> en tant que <strong style="color:#fff">${roleLabel}</strong>.
          </p>
          <p style="color:#a8b0c8;font-size:14px;line-height:1.5;margin:0 0 22px">
            Rejoignez l’équipe pour travailler ensemble sur les tunnels, campagnes et projets.
          </p>
          <a href="${opts.acceptUrl}" style="display:inline-block;background:#5b5cf0;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px">
            Accéder à Conik →
          </a>
          <p style="color:#6b7280;font-size:12px;margin:24px 0 0;line-height:1.4">
            Si le bouton ne fonctionne pas, copiez ce lien :<br/>
            <a href="${opts.acceptUrl}" style="color:#8b9cf7">${opts.acceptUrl}</a>
          </p>
        </td></tr>
        <tr><td style="padding:16px 28px 24px;color:#4b5563;font-size:11px">Conik.io — Marketing OS</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  if (!key) return { sent: false as const, reason: 'RESEND_API_KEY manquante' }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: `${opts.inviterName} vous invite sur ${opts.orgName} — Conik`,
      html,
    }),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    return { sent: false as const, reason: t || 'envoi email échoué' }
  }
  return { sent: true as const }
}

export async function GET() {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { data: members } = await supabase
    .from('organization_members')
    .select('id,user_id,role,created_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: true })

  let enriched = members || []
  try {
    const admin = createAdminClient()
    enriched = await Promise.all(
      (members || []).map(async (m) => {
        try {
          const { data } = await admin.auth.admin.getUserById(m.user_id)
          return { ...m, email: data.user?.email || undefined }
        } catch {
          return m
        }
      }),
    )
  } catch {
    /* ignore */
  }

  const { data: invites } = await supabase
    .from('organization_invites')
    .select('id,email,role,status,created_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ members: enriched, invites: invites || [] })
}

export async function POST(request: Request) {
  try {
    const { supabase, user, organization } = await requireWorkspaceRole(['owner', 'admin'])
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Email et rôle valides requis.' }, { status: 400 })

    const email = parsed.data.email.trim().toLowerCase()
    if (user.email && user.email.toLowerCase() === email) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous inviter vous-même.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: organization.id,
        email,
        role: parsed.data.role,
        invited_by: user.id,
        status: 'pending',
      })
      .select('id,email,role,status,created_at')
      .maybeSingle()

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Table organization_invites absente. Exécutez la migration support_and_invites dans Supabase.' },
          { status: 400 },
        )
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const inviterName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email ||
      'Un organisateur'
    const orgName = organization.name || 'un espace Conik'
    const acceptUrl = `${APP_URL}/signup?invite=${encodeURIComponent(data?.id || '')}&email=${encodeURIComponent(email)}`

    const mail = await sendInviteEmail({
      to: email,
      inviterName,
      orgName,
      role: parsed.data.role,
      acceptUrl,
    })

    return NextResponse.json(
      {
        invite: data,
        message: mail.sent
          ? `Invitation envoyée par e-mail à ${email}.`
          : `Invitation enregistrée pour ${email}. (E-mail non envoyé : configurez RESEND_API_KEY)`,
        emailSent: mail.sent,
      },
      { status: 201 },
    )
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur invitation' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin'])
    const body = await request.json().catch(() => ({}))
    const inviteId = typeof body.inviteId === 'string' ? body.inviteId : null
    const memberId = typeof body.memberId === 'string' ? body.memberId : null

    if (inviteId) {
      const { error } = await supabase
        .from('organization_invites')
        .delete()
        .eq('id', inviteId)
        .eq('organization_id', organization.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true })
    }

    if (memberId) {
      const { data: row } = await supabase
        .from('organization_members')
        .select('id,role,user_id')
        .eq('id', memberId)
        .eq('organization_id', organization.id)
        .maybeSingle()
      if (!row) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })
      if (row.role === 'owner') {
        return NextResponse.json({ error: 'Impossible de retirer l’organisateur principal.' }, { status: 400 })
      }
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId)
        .eq('organization_id', organization.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'inviteId ou memberId requis' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
