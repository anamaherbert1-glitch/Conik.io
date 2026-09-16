import { FunnelRuntime } from '@/components/funnel-runtime'
import { PublicPaymentCheckout } from '@/components/public-payment-checkout'

export default async function PublicFunnelPage({
  params,
  searchParams,
}: {
  params: Promise<{ funnelSlug: string; pageSlug: string }>
  searchParams: Promise<{ tarif?: string; tariff?: string }>
}) {
  const { funnelSlug, pageSlug } = await params
  const query = await searchParams
  const tariffSlug = query.tarif || query.tariff || ''
  return <>
    <FunnelRuntime funnelSlug={funnelSlug} pageSlug={pageSlug} />
    {tariffSlug && <PublicPaymentCheckout funnelSlug={funnelSlug} pageSlug={pageSlug} tariffSlug={tariffSlug} />}
  </>
}
