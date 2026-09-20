import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(request: Request) {
  try {
    await requirePlatformAdmin({ api: true })
    const body = await request.json()
    const id = String(body.id || '')
    const status = String(body.status || '')
    if (!id || !['open', 'resolved', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }
    const admin = createAdminClient()
    const { error } = await admin.from('support_feedback').update({ status }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
