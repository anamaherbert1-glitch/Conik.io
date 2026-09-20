import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan, type PlanCode } from '@/lib/billing/plans'

export async function POST(request: Request) {
  try {
    const { membership, user } = await requireWorkspaceRole(['owner', 'admin'])
    const body = await request.json().catch(() => ({}))
    const plan = String(body.plan || '') as PlanCode
    if (!['free', 'basic', 'premium', 'business'].includes(plan)) {
      return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    }

    const def = getPlan(plan)
    const admin = createAdminClient()

    if (plan === 'free') {
      const starts = new Date()
      const ends = new Date(starts)
      ends.setFullYear(ends.getFullYear() + 10)
      await admin.from('conik_subscriptions').insert({
        organization_id: membership.organizationId,
        user_id: user.id,
        plan_code: 'free',
        duration_days: 3650,
        amount: 0,
        currency: 'XOF',
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        status: 'active',
      })
      return NextResponse.json({ ok: true, plan: 'free' })
    }

    const starts = new Date()
    const ends = new Date(starts)
    ends.setDate(ends.getDate() + 30)
    await admin.from('conik_subscriptions').insert({
      organization_id: membership.organizationId,
      user_id: user.id,
      plan_code: plan,
      duration_days: 30,
      amount: def.priceMonthlyXof,
      currency: 'XOF',
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      status: 'pending',
    })

    return NextResponse.json({
      ok: true,
      plan,
      message:
        'Demande enregistrée. Le paiement via les prestataires Conik activera le plan automatiquement.',
      amount: def.priceMonthlyXof,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
