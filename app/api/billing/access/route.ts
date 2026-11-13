import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import type { FeatureKey } from '@/lib/billing/features'
import { BILLING_ENABLED } from '@/lib/billing/enforce'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
    const key = new URL(request.url).searchParams.get('feature') as FeatureKey | null
    if (!key) return NextResponse.json({ error: 'Feature requise.' }, { status: 400 })
    if (!BILLING_ENABLED) {
      return NextResponse.json({
        allowed: true,
        plan_code: 'test',
        feature_key: key,
        limit_value: null,
        limit_period: null,
        config: { test_mode: true },
        upgrade_required: false,
      })
    }
    return NextResponse.json({ error: 'Vérification de forfait indisponible.' }, { status: 503 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Vérification impossible.' }, { status: 500 })
  }
}
