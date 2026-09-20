import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PUT(request: Request) {
  try {
    await requirePlatformAdmin({ api: true })
    const body = await request.json()
    const rows = Array.isArray(body.rows) ? body.rows : []
    if (rows.length === 0) return NextResponse.json({ error: 'Aucune ligne' }, { status: 400 })

    const admin = createAdminClient()
    for (const r of rows) {
      const payload = {
        product_code: String(r.product_code),
        plan_code: String(r.plan_code),
        product_type: String(r.product_type),
        price: Number(r.price || 0),
        daily_price: r.daily_price == null || r.daily_price === '' ? null : Number(r.daily_price),
        currency: String(r.currency || 'XOF'),
        active: Boolean(r.active),
        updated_at: new Date().toISOString(),
      }
      const { error } = await admin.from('subscription_billing_catalog').upsert(payload, { onConflict: 'product_code' })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
