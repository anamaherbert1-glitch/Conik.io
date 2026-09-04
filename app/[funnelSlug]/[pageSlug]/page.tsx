import { FunnelRuntime } from '@/components/funnel-runtime'

export default async function PublicFunnelPage({
  params,
}: {
  params: Promise<{ funnelSlug: string; pageSlug: string }>
}) {
  const { funnelSlug, pageSlug } = await params
  return <FunnelRuntime funnelSlug={funnelSlug} pageSlug={pageSlug} />
}
