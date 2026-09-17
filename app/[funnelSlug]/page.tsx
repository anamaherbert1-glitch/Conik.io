import type { Metadata } from 'next'
import { FunnelRuntime } from '@/components/funnel-runtime'
import { PublicPaymentCheckout } from '@/components/public-payment-checkout'
import { loadPublishedFunnelPage } from '@/lib/funnel/public-page'
import { createClient } from '@/lib/supabase/server'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
const DEFAULT_SHARE_IMAGE = APP_URL ? `${APP_URL}/api/og-default` : ''

async function getPublishedPageMetadata(funnelSlug: string, pageSlug: string) {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_published_funnel_page_with_capture', {
    target_funnel_slug: funnelSlug,
    target_page_slug: pageSlug || 'home',
  })

  const page = data?.[0]
  if (!page) return null

  const metadata =
    page.metadata && typeof page.metadata === 'object'
      ? (page.metadata as Record<string, unknown>)
      : {}
  const shareImage =
    typeof metadata.share_image_url === 'string' ? metadata.share_image_url.trim() : ''

  return {
    title:
      typeof page.page_name === 'string' && page.page_name.trim()
        ? page.page_name.trim()
        : typeof page.funnel_name === 'string' && page.funnel_name.trim()
          ? page.funnel_name.trim()
          : 'Conik',
    description:
      typeof metadata.share_description === 'string' ? metadata.share_description.trim() : '',
    shareImage,
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ funnelSlug: string }>
}): Promise<Metadata> {
  const { funnelSlug } = await params
  const page = await getPublishedPageMetadata(funnelSlug, 'home')
  const title = page?.title || 'Conik'
  const description = page?.description || `Découvrez ${title}`
  const image = page?.shareImage || DEFAULT_SHARE_IMAGE || undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
}

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
  const { page, payment, missing } = await loadPublishedFunnelPage(funnelSlug, 'home')

  return (
    <>
      <FunnelRuntime
        funnelSlug={funnelSlug}
        pageSlug="home"
        initialPage={page}
        initialPayment={payment}
        initialMissing={missing}
      />
      {tariffSlug && (
        <PublicPaymentCheckout
          funnelSlug={funnelSlug}
          pageSlug="home"
          tariffSlug={tariffSlug}
        />
      )}
    </>
  )
}
