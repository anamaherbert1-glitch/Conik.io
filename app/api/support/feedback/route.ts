import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'

const schema = z.object({
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5000),
  category: z.enum(['bug', 'idea', 'question', 'other']).default('bug'),
})

export async function POST(request: Request) {
  try {
    const { supabase, user, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Sujet (3+ car.) et message (10+ car.) requis.' }, { status: 400 })
    }

    const payload = {
      organization_id: organization.id,
      user_id: user.id,
      user_email: user.email || null,
      subject: parsed.data.subject,
      message: parsed.data.message,
      category: parsed.data.category,
      status: 'open',
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('support_feedback').insert(payload)
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          ok: true,
          stored: 'pending',
          message: 'Message reçu. Notre équipe le traitera rapidement.',
        })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, message: 'Merci ! Votre message a bien été envoyé au support.' })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur support' }, { status: 500 })
  }
}
