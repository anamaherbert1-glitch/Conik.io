import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type PublicPublishedPage = {
  funnel_id: string
  funnel_name?: string
  page_id: string
  page_name: string
  page_slug?: string
  html: string
  css: string
  js: string
  metadata?: Record<string, unknown>
  capture_enabled?: boolean
  capture_delay_ms?: number
  capture_html?: string
  capture_css?: string
  capture_js?: string
  is_first_page?: boolean
}

export type PublicPaymentMeta = {
  id: string
  name: string
  slug: string
  status: string
  funnel_id: string
  tariff_slug: string | null
}

async function hydrateLargeContent(page: PublicPublishedPage) {
  try {
    const meta =
      page.metadata && typeof page.metadata === 'object'
        ? (page.metadata as Record<string, unknown>)
        : {}
    const admin = createAdminClient()
    async function pull(urlOrPath: unknown, current: string) {
      if (typeof urlOrPath !== 'string' || !urlOrPath) return current
      if (urlOrPath.startsWith('http')) {
        const res = await fetch(urlOrPath, { cache: 'force-cache' })
        if (res.ok) return await res.text()
        return current
      }
      const { data } = await admin.storage.from('funnel-assets').download(urlOrPath)
      if (data) return await data.text()
      return current
    }
    if (meta.html_url || meta.html_path) {
      page.html = await pull(meta.html_url || meta.html_path, page.html || '')
    }
    if (meta.css_url || meta.css_path) {
      page.css = await pull(meta.css_url || meta.css_path, page.css || '')
    }
    if (meta.js_url || meta.js_path) {
      page.js = await pull(meta.js_url || meta.js_path, page.js || '')
    }
  } catch {
    // keep DB content
  }
  return page
}

export async function loadPublishedFunnelPage(funnelSlug: string, pageSlug: string) {
  const slug = (pageSlug || 'home').trim() || 'home'
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_published_funnel_page_with_capture', {
    target_funnel_slug: funnelSlug,
    target_page_slug: slug,
  })

  if (error || !data?.[0]) {
    return {
      page: null as PublicPublishedPage | null,
      payment: null as PublicPaymentMeta | null,
      missing: true as const,
    }
  }

  let page = data[0] as PublicPublishedPage
  page = await hydrateLargeContent(page)

  let payment: PublicPaymentMeta | null = null
  if (page.funnel_id) {
    const admin = createAdminClient()
    const [paymentRes, tariffRes] = await Promise.all([
      admin
        .from('payment_pages')
        .select('id,name,slug,status,funnel_id,checkout_config')
        .eq('funnel_id', page.funnel_id)
        .eq('status', 'published')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      admin
        .from('payment_tariffs')
        .select('slug')
        .eq('funnel_id', page.funnel_id)
        .eq('active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])
    const paymentPage = paymentRes.data
    if (paymentPage) {
      const checkoutConfig =
        paymentPage.checkout_config && typeof paymentPage.checkout_config === 'object'
          ? (paymentPage.checkout_config as Record<string, unknown>)
          : {}
      let tariffSlug =
        typeof checkoutConfig.tariff_slug === 'string' ? checkoutConfig.tariff_slug : null
      if (!tariffSlug) tariffSlug = tariffRes.data?.slug || null
      payment = {
        id: paymentPage.id,
        name: paymentPage.name,
        slug: paymentPage.slug,
        status: paymentPage.status,
        funnel_id: paymentPage.funnel_id,
        tariff_slug: tariffSlug,
      }
    }
  }

  return { page, payment, missing: false as const }
}

export async function shouldShowFreeBranding(funnelId: string | null | undefined) {
  if (!funnelId) return true
  try {
    const { getFunnelOrganizationId, getOrganizationPlanCode } = await import('@/lib/billing/enforce')
    const orgId = await getFunnelOrganizationId(funnelId)
    if (!orgId) return true
    const plan = await getOrganizationPlanCode(orgId)
    return plan === 'free'
  } catch {
    return true
  }
}
