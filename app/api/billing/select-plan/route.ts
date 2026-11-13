import { NextResponse } from 'next/server'
import { BILLING_ENABLED } from '@/lib/billing/enforce'

export async function POST() {
  if (!BILLING_ENABLED) {
    return NextResponse.json({
      error: 'La sélection des forfaits est temporairement désactivée pendant la phase de test gratuit.',
      code: 'BILLING_TEMPORARILY_DISABLED',
    }, { status: 503 })
  }
  return NextResponse.json({ error: 'Sélection de forfait indisponible.' }, { status: 503 })
}
