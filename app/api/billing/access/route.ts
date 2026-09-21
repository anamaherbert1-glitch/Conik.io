import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import type { FeatureKey } from '@/lib/billing/features'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
    const key = new URL(request.url).searchParams.get('feature') as FeatureKey | null
    if (!key) return NextResponse.json({ error: 'Feature requise.' }, { status: 400 })

    const { data, error } = await supabase.rpc('conik_check_feature_access', {
      p_organization_id: membership.organizationId,
      p_feature_key: key,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const access = Array.isArray(data) ? data[0] : data
    return NextResponse.json(access || {
      allowed: false,
      plan_code: 'free',
      feature_key: key,
      limit_value: 0,
      limit_period: null,
      config: {},
      upgrade_required: true,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Vérification impossible.' }, { status: 500 })
  }
}
