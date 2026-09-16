import { AppShell } from '@/components/app-shell'
import { SubscriptionSelector } from '@/components/subscription-selector'
import { requireWorkspaceRole } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

export default async function SubscriptionsPage() {
  const { supabase, membership } = await requireWorkspaceRole(['owner','admin','editor','viewer'])
  const [{ data: catalog }, { data: status }] = await Promise.all([
    supabase.from('subscription_billing_catalog').select('product_code,plan_code,product_type,price,daily_price').eq('active',true),
    supabase.rpc('conik_get_subscription_status',{p_organization_id:membership.organizationId}),
  ])
  const get = (code:string) => (catalog || []).find((x:{product_code:string})=>x.product_code===code) as {price?:number;daily_price?:number}|undefined
  const row = Array.isArray(status) ? status[0] : status
  return <AppShell active="Dashboard"><header><div><small>CONIK BILLING</small><h1>Abonnements</h1><p className="muted">Gérez séparément votre abonnement Conik et votre option WhatsApp GREEN-API.</p></div></header><SubscriptionSelector basicPrice={Number(get('conik_basic')?.price||0)} premiumPrice={Number(get('conik_premium')?.price||0)} whatsappDailyBasic={Number(get('whatsapp_basic')?.daily_price||0)} whatsappDailyPremium={Number(get('whatsapp_premium')?.daily_price||0)} whatsappEndsAt={row?.whatsapp_ends_at || null}/></AppShell>
}
