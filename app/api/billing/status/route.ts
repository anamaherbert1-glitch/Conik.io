import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { BILLING_ENABLED } from '@/lib/billing/enforce'

export async function GET() {
  try {
    await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
    if (!BILLING_ENABLED) {
      return NextResponse.json({
        billingEnabled: false,
        testMode: true,
        currentPlan: 'business',
        prices: { free: 0, basic: 0, premium: 0, business: 0 },
        whatsappEndsAt: null,
        message: 'Les abonnements Conik sont suspendus pendant la phase de test gratuit.',
      })
    }
    return NextResponse.json({ error: 'Service abonnement indisponible.' }, { status: 503 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
