import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { getOrganizationPlanCode, getOrganizationSubscription } from '@/lib/billing/enforce'
import { getPlan } from '@/lib/billing/plans'
import { nextPlan } from '@/lib/billing/features'

export async function GET() {
  try {
    const { membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
    const plan = await getOrganizationPlanCode(membership.organizationId)
    const sub = await getOrganizationSubscription(membership.organizationId)
    const def = getPlan(plan)
    return NextResponse.json({
      plan,
      planName: def.name,
      status: sub?.status || 'active',
      endsAt: sub?.ends_at || null,
      nextPlan: nextPlan(plan),
      limits: def.limits,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
