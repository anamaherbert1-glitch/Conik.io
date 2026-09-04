import { FunnelRuntime } from '@/components/funnel-runtime'

export default async function PublicFunnelHome({
  params,
}: {
  params: Promise<{ funnelSlug: string }>
}) {
  const { funnelSlug } = await params
  return <FunnelRuntime funnelSlug={funnelSlug} pageSlug="home" />
}
