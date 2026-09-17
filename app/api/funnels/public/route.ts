import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const u = new URL(request.url)
  const f = u.searchParams.get('funnel') || ''
  const p = u.searchParams.get('page') || 'home'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p)) {
    return NextResponse.json({ error: 'Route invalide' }, { status: 400 })
  }

  const s = await createClient()
  const { data, error } = await s.rpc('get_published_funnel_page_with_capture', {
    target_funnel_slug: f,
    target_page_slug: p,
  })
  if (error || !data?.[0]) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
  }

  const page = data[0]
  let payment: null | {
    id: string
    name: string
    slug: string
    status: string
    funnel_id: string
    tariff_slug: string | null
  } = null

  if (page.funnel_id) {
    const admin = createAdminClient()
    const [paymentRes, tariffRes] = await Promise.all([
      admin
        .from('payment_pages')
        .select('id,name,slug,status,funnel_id,checkout_config')
        .eq('funnel_id', page.funnel_id)
        .eq('slug', p)
        .eq('status', 'published')
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
      let tariffSlug = typeof checkoutConfig.tariff_slug === 'string' ? checkoutConfig.tariff_slug : null
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
  } catch {}

  return NextResponse.json(
    { page, payment },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
      },
    },
  )
}
