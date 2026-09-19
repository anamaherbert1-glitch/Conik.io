import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer']).default('editor'),
})

export async function GET() {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { data: members } = await supabase
    .from('organization_members')
    .select('id,user_id,role,created_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: true })

  const { data: invites } = await supabase
    .from('organization_invites')
    .select('id,email,role,status,created_at')
    .eq('organization_id', organization.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ members: members || [], invites: invites || [] })
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
        return NextResponse.json({
          error: 'Table organization_invites absente. Exécutez la migration 20260919180000_support_and_invites.sql dans Supabase.',
        }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      invite: data,
      message: `Invitation enregistrée pour ${email}.`,
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur invitation' }, { status: 500 })
  }
}
