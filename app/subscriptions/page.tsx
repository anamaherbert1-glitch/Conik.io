import { AppShell } from '@/components/app-shell'
import { PlanPricingColumns } from '@/components/plan-pricing-columns'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { getOrganizationPlanCode } from '@/lib/billing/enforce'
import type { PlanCode } from '@/lib/billing/plans'
import { PLANS } from '@/lib/billing/plans'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SubscriptionsPage() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])

  const [{ data: catalog }, currentPlan] = await Promise.all([
    supabase
      .from('subscription_billing_catalog')
      .select('product_code,plan_code,price,billing_interval')
      .eq('active', true)
      .eq('product_type', 'conik'),
    getOrganizationPlanCode(membership.organizationId),
  ])

  const get = (code: string, interval: 'monthly' | 'annual') =>
    (catalog || []).find((x: { product_code: string; billing_interval: string }) =>
      x.product_code === code && x.billing_interval === interval) as { price?: number } | undefined

  const prices = {
    free: 0,
    basic: Number(get('conik_basic', 'monthly')?.price ?? PLANS.find((p) => p.code === 'basic')?.priceMonthlyEur ?? 5),
    premium: Number(get('conik_premium', 'monthly')?.price ?? PLANS.find((p) => p.code === 'premium')?.priceMonthlyEur ?? 12),
    business: Number(get('conik_business', 'monthly')?.price ?? PLANS.find((p) => p.code === 'business')?.priceMonthlyEur ?? 29),
  }

  const annualPrices = {
    free: 0,
    basic: Number(get('conik_basic_annual', 'annual')?.price ?? PLANS.find((p) => p.code === 'basic')?.priceAnnualEur ?? 50),
    premium: Number(get('conik_premium_annual', 'annual')?.price ?? PLANS.find((p) => p.code === 'premium')?.priceAnnualEur ?? 120),
    business: Number(get('conik_business_annual', 'annual')?.price ?? PLANS.find((p) => p.code === 'business')?.priceAnnualEur ?? 290),
  }

  return (
    <AppShell active="Settings" compact>
      <div style={{ marginBottom: 12 }}>
        <Link href="/settings" className="muted" style={{ fontSize: 13, textDecoration: 'none' }}>
          ← Retour aux paramètres
        </Link>
      </div>
      <PlanPricingColumns prices={prices} annualPrices={annualPrices} currentPlan={currentPlan as PlanCode} />
    </AppShell>
  )
}
