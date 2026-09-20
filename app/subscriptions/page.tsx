import { AppShell } from '@/components/app-shell'
import { SubscriptionSelector } from '@/components/subscription-selector'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import type { PlanCode } from '@/lib/billing/plans'

export const dynamic = 'force-dynamic'

export default async function SubscriptionsPage() {
  const { supabase, membership } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])

  const [{ data: catalog }, { data: status }] = await Promise.all([
    supabase
      .from('subscription_billing_catalog')
      .select('product_code,plan_code,product_type,price,daily_price')
      .eq('active', true),
    supabase.rpc('conik_get_subscription_status', { p_organization_id: membership.organizationId }),
  ])

  const getPrice = (code: string) => {
    const row = (catalog || []).find((x: { product_code: string }) => x.product_code === code) as
      | { price?: number; daily_price?: number }
      | undefined
    return row
  }

  const row = Array.isArray(status) ? status[0] : status
  const currentPlan = (row?.plan_code || row?.conik_plan || 'free') as PlanCode

  const prices = {
    free: 0,
    basic: Number(getPrice('conik_basic')?.price ?? 15000),
    premium: Number(getPrice('conik_premium')?.price ?? 45000),
    business: Number(getPrice('conik_business')?.price ?? 99000),
  }

  return (
    <AppShell active="Settings">
      <header className="head">
        <div>
          <small>FACTURATION</small>
          <h1>Abonnements</h1>
          <p className="muted">
            Free · Basic · Premium · Business — limites claires, add-ons possibles au-delà.
          </p>
        </div>
      </header>
      <SubscriptionSelector
        prices={prices}
        currentPlan={currentPlan}
        whatsappDailyBasic={Number(getPrice('whatsapp_basic')?.daily_price ?? 0)}
        whatsappDailyPremium={Number(getPrice('whatsapp_premium')?.daily_price ?? 0)}
        whatsappEndsAt={row?.whatsapp_ends_at || null}
      />
    </AppShell>
  )
}
