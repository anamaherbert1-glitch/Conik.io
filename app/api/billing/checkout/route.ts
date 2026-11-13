import { NextResponse } from 'next/server'
import { BILLING_ENABLED } from '@/lib/billing/enforce'

export async function POST() {
  if (!BILLING_ENABLED) {
    return NextResponse.json({
      error: 'Les abonnements et paiements Conik sont temporairement désactivés pendant la phase de test.',
      code: 'BILLING_TEMPORARILY_DISABLED',
    }, { status: 503 })
  }
  return NextResponse.json({ error: 'Route de paiement indisponible.' }, { status: 503 })
}
