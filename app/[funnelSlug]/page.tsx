import { FunnelRuntime } from '@/components/funnel-runtime'
import { PublicPaymentCheckout } from '@/components/public-payment-checkout'

export default async function PublicFunnelHome({
  params,
  searchParams,
}: {
  params: Promise<{ funnelSlug: string }>
  searchParams: Promise<{ tarif?: string; tariff?: string }>
}) {
  const { funnelSlug } = await params
  const query = await searchParams
  const tariffSlug = query.tarif || query.tariff || ''
  return <>
    <FunnelRuntime funnelSlug={funnelSlug} pageSlug="home" />
    {tariffSlug && <PublicPaymentCheckout funnelSlug={funnelSlug} pageSlug="home" tariffSlug={tariffSlug} />}
  </>
}
