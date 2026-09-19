import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'

const schema = z.object({
  fullName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  country: z.string().trim().max(80).optional(),
  countryCode: z.string().trim().max(8).optional(),
  city: z.string().trim().max(80).optional(),
  company: z.string().trim().max(120).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  orgName: z.string().trim().min(2).max(120).optional(),
})

export async function GET() {
  const { user, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const meta = (user.user_metadata || {}) as Record<string, string>
  return NextResponse.json({
    email: user.email,
    fullName: meta.full_name || meta.name || '',
    phone: meta.phone || '',
    country: meta.country || '',
    countryCode: meta.country_code || '',
    city: meta.city || '',
    company: meta.company || '',
    avatarUrl: meta.avatar_url || '',
    orgName: organization.name,
    orgId: organization.id,
  })
}

export async function PATCH(request: Request) {
  try {
    const { supabase, user, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })

    const meta = { ...(user.user_metadata || {}) } as Record<string, unknown>
    if (parsed.data.fullName !== undefined) meta.full_name = parsed.data.fullName
    if (parsed.data.phone !== undefined) meta.phone = parsed.data.phone
    if (parsed.data.country !== undefined) meta.country = parsed.data.country
    if (parsed.data.countryCode !== undefined) meta.country_code = parsed.data.countryCode
    if (parsed.data.city !== undefined) meta.city = parsed.data.city
    if (parsed.data.company !== undefined) meta.company = parsed.data.company
    if (parsed.data.avatarUrl !== undefined) meta.avatar_url = parsed.data.avatarUrl || null

    const { error: authError } = await supabase.auth.updateUser({ data: meta })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    if (parsed.data.orgName) {
      await supabase
        .from('organizations')
        .update({ name: parsed.data.orgName.trim(), updated_at: new Date().toISOString() })
        .eq('id', organization.id)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur profil' }, { status: 500 })
  }
}
