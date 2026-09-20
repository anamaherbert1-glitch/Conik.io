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
      .select('product_code,plan_code,price,daily_price')
      .eq('active', true),
    getOrganizationPlanCode(membership.organizationId),
  ])

  const get = (code: string) =>
    (catalog || []).find((x: { product_code: string }) => x.product_code === code) as
      | { price?: number }
      | undefined

  const prices = {
    free: 0,
    basic: Number(get('conik_basic')?.price ?? PLANS.find((p) => p.code === 'basic')?.priceMonthlyXof),
    premium: Number(get('conik_premium')?.price ?? PLANS.find((p) => p.code === 'premium')?.priceMonthlyXof),
    business: Number(
      get('conik_business')?.price ?? PLANS.find((p) => p.code === 'business')?.priceMonthlyXof,
    ),
  }

  return (
    <AppShell active="Settings" compact>
      <div style={{ marginBottom: 12 }}>
        <Link href="/settings" className="muted" style={{ fontSize: 13, textDecoration: 'none' }}>
          ← Retour aux paramètres
        </Link>
      </div>
      <PlanPricingColumns prices={prices} currentPlan={currentPlan as PlanCode} />
    </AppShell>
  )
}
