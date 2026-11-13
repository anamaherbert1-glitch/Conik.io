import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { BILLING_ENABLED, getOrganizationLimits } from '@/lib/billing/enforce'

export async function GET() {
  try {
    const { membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
    if (!BILLING_ENABLED) {
      return NextResponse.json({
        billingEnabled: false,
        testMode: true,
        plan: 'business',
        planName: 'Accès test gratuit',
        status: 'test',
        endsAt: null,
        limits: await getOrganizationLimits(membership.organizationId),
      })
    }
    return NextResponse.json({ error: 'Service abonnement indisponible.' }, { status: 503 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
