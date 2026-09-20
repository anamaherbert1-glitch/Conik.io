import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'

const TABLES = new Set(['conik_subscriptions', 'whatsapp_subscriptions'])
const STATUSES = new Set(['active', 'expired', 'cancelled', 'pending'])

export async function PATCH(request: Request) {
  try {
    await requirePlatformAdmin({ api: true })
    const body = await request.json()
    const id = String(body.id || '')
    const table = String(body.table || '')
    const status = String(body.status || '')
    if (!id || !TABLES.has(table) || !STATUSES.has(status)) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }
    const admin = createAdminClient()
    const { error } = await admin.from(table).update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
