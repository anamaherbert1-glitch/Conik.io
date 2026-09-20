import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlan, type PlanCode } from '@/lib/billing/plans'

export async function POST(request: Request) {
  try {
    const { membership, user } = await requireWorkspaceRole(['owner', 'admin'])
    const body = await request.json().catch(() => ({}))
    const plan = String(body.plan || '') as PlanCode
    const interval = body.interval === 'annual' ? 'annual' : 'monthly'

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
        currency: 'EUR',
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        status: 'active',
      })
      return NextResponse.json({ ok: true, plan: 'free', interval: 'annual' })
    }

    const price = interval === 'annual' ? def.priceAnnualEur : def.priceMonthlyEur
    const durationDays = interval === 'annual' ? 365 : 30
    const starts = new Date()
    const ends = new Date(starts)
    ends.setDate(ends.getDate() + durationDays)

    await admin.from('conik_subscriptions').insert({
      organization_id: membership.organizationId,
      user_id: user.id,
      plan_code: plan,
      duration_days: durationDays,
      amount: price,
      currency: 'EUR',
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      status: 'pending',
    })

    return NextResponse.json({
      ok: true,
      plan,
      interval,
      message: `Demande enregistrée pour le forfait ${interval === 'annual' ? 'annuel' : 'mensuel'} à ${price} €.`,
      amount: price,
      currency: 'EUR',
      durationDays,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
