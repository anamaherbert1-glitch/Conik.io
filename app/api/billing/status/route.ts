import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { getOrganizationPlanCode } from '@/lib/billing/enforce'
import { PLANS } from '@/lib/billing/plans'

export async function GET() {
  try {
    const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
    const [{ data: catalog }, { data: status }] = await Promise.all([
      supabase
        .from('subscription_billing_catalog')
        .select('product_code,plan_code,product_type,price,daily_price')
        .eq('active', true),
      supabase.rpc('conik_get_subscription_status', { p_organization_id: membership.organizationId }),
    ])

    const get = (code: string) =>
      (catalog || []).find((x: { product_code: string }) => x.product_code === code) as
        | { price?: number; daily_price?: number }
        | undefined

    const row = Array.isArray(status) ? status[0] : status
    let currentPlan = await getOrganizationPlanCode(membership.organizationId)
    if (row?.plan_code) currentPlan = String(row.plan_code).toLowerCase() as typeof currentPlan

    const prices = {
      free: 0,
      basic: Number(get('conik_basic')?.price ?? PLANS.find((p) => p.code === 'basic')?.priceMonthlyXof),
      premium: Number(get('conik_premium')?.price ?? PLANS.find((p) => p.code === 'premium')?.priceMonthlyXof),
      business: Number(get('conik_business')?.price ?? PLANS.find((p) => p.code === 'business')?.priceMonthlyXof),
    }

    return NextResponse.json({
      currentPlan,
      prices,
      whatsappEndsAt: row?.whatsapp_ends_at || null,
      whatsappDailyBasic: Number(get('whatsapp_basic')?.daily_price ?? 0),
      whatsappDailyPremium: Number(get('whatsapp_premium')?.daily_price ?? 0),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur' }, { status: 500 })
  }
}
