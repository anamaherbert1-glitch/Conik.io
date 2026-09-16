import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const funnelSlug = url.searchParams.get('funnel')
  const tariffSlug = url.searchParams.get('tarif')
  const pageSlug = url.searchParams.get('page')
  if ((!funnelSlug && !pageSlug) || !tariffSlug) return NextResponse.json({ error: 'Paramètres page/funnel et tarif requis' }, { status: 400 })

  try {
    const supabase = createAdminClient()
    let funnel: any = null
    let paymentPage: any = null
    if (pageSlug) {
      const { data, error } = await supabase.from('payment_pages').select('id,organization_id,funnel_id,name,slug,status,currency,amount_type,fixed_amount,checkout_config,success_url,cancel_url').eq('slug', pageSlug).eq('status', 'published').maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      paymentPage = data
      if (!paymentPage) return NextResponse.json({ error: 'Page de paiement introuvable ou non publiée' }, { status: 404 })
      const { data: f } = await supabase.from('funnels').select('id,name,slug,organization_id,payment_enabled,payment_html,payment_css,payment_js,payment_provider_id,status').eq('id', paymentPage.funnel_id).eq('organization_id', paymentPage.organization_id).maybeSingle()
      funnel = f
    } else {
      const { data: f } = await supabase.from('funnels').select('id,name,slug,organization_id,payment_enabled,payment_html,payment_css,payment_js,payment_provider_id,status').eq('slug', funnelSlug).maybeSingle()
      funnel = f
    }
    if (!funnel || funnel.status !== 'published' || !funnel.payment_enabled) return NextResponse.json({ error: 'Tunnel introuvable, non publié ou paiement désactivé' }, { status: 404 })

    const { data: tariff } = await supabase.from('payment_tariffs').select('id,name,amount_cents,currency,slug,product_label,active,funnel_id,organization_id').eq('funnel_id', funnel.id).eq('organization_id', funnel.organization_id).eq('slug', tariffSlug).eq('active', true).maybeSingle()
    if (!tariff) return NextResponse.json({ error: 'Tarif introuvable' }, { status: 404 })

    let provider: any = null
    if (funnel.payment_provider_id) {
      const { data: p } = await supabase.from('payment_providers').select('id,provider,label,status').eq('id', funnel.payment_provider_id).eq('organization_id', funnel.organization_id).maybeSingle()
      if (p && ['connected', 'active'].includes(p.status)) provider = p
    }

    let methods: any[] = []
    if (paymentPage?.id) {
      const { data } = await supabase.from('payment_page_methods').select('id,provider_id,method_code,display_name,enabled,sort_order,config').eq('payment_page_id', paymentPage.id).eq('enabled', true).order('sort_order', { ascending: true })
      methods = data || []
      const providerIds = [...new Set(methods.map(method => method.provider_id).filter(Boolean))]
      if (providerIds.length) {
        const { data: methodProviders } = await supabase.from('payment_providers').select('id,provider,label,status').in('id', providerIds).eq('organization_id', funnel.organization_id)
        const providerById = new Map((methodProviders || []).map(item => [item.id, item]))
        methods = methods.map(method => ({ ...method, provider: providerById.get(method.provider_id)?.provider || null, provider_label: providerById.get(method.provider_id)?.label || null }))
      }
    }

    return NextResponse.json({ funnel: { id: funnel.id, name: funnel.name, slug: funnel.slug }, paymentPage, tariff, provider, methods, page: { html: funnel.payment_html || '', css: funnel.payment_css || '', js: funnel.payment_js || '' } })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur paiement' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.funnelId || !body?.tariffId) return NextResponse.json({ error: 'funnelId et tariffId requis' }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const { data: tariff } = await supabase.from('payment_tariffs').select('id,funnel_id,organization_id,amount_cents,currency,name,product_label,active').eq('id', body.tariffId).maybeSingle()
    if (!tariff || !tariff.active) return NextResponse.json({ error: 'Tarif invalide' }, { status: 404 })
    if (tariff.funnel_id !== body.funnelId) return NextResponse.json({ error: 'Tarif incompatible avec ce tunnel' }, { status: 400 })

    const { data: funnel } = await supabase.from('funnels').select('id,organization_id,payment_provider_id,payment_enabled').eq('id', tariff.funnel_id).eq('organization_id', tariff.organization_id).maybeSingle()
    if (!funnel?.payment_enabled) return NextResponse.json({ error: 'Paiement désactivé' }, { status: 400 })

    const paymentPageId = body.paymentPageId ? String(body.paymentPageId) : null
    if (paymentPageId) {
      const { data: page } = await supabase.from('payment_pages').select('id,funnel_id,organization_id,status').eq('id', paymentPageId).eq('funnel_id', funnel.id).eq('organization_id', funnel.organization_id).maybeSingle()
      if (!page || page.status !== 'published') return NextResponse.json({ error: 'Page de paiement invalide' }, { status: 400 })
    }

    const methodCode = body.methodCode ? String(body.methodCode).slice(0, 100) : null
    let providerId = funnel.payment_provider_id || null
    if (methodCode && paymentPageId) {
      const { data: method } = await supabase.from('payment_page_methods').select('provider_id,method_code').eq('payment_page_id', paymentPageId).eq('method_code', methodCode).eq('enabled', true).maybeSingle()
      if (!method) return NextResponse.json({ error: 'Moyen de paiement indisponible sur cette page.' }, { status: 400 })
      providerId = method.provider_id
    }
    if (!providerId) return NextResponse.json({ error: 'Aucun prestataire associé au moyen de paiement.' }, { status: 400 })

    const { data: provider } = await supabase.from('payment_providers').select('id,status').eq('id', providerId).eq('organization_id', funnel.organization_id).maybeSingle()
    if (!provider || !['connected', 'active'].includes(provider.status)) return NextResponse.json({ error: 'Prestataire de paiement non connecté ou inactif.' }, { status: 400 })

    const buyerEmail = body.email ? String(body.email).slice(0, 320) : null
    const buyerPhone = body.phone ? String(body.phone).slice(0, 40) : null
    const buyerName = body.name ? String(body.name).slice(0, 160) : null
    const { data: order, error: orderError } = await supabase.from('payment_orders').insert({
      organization_id: tariff.organization_id, funnel_id: tariff.funnel_id, tariff_id: tariff.id, provider_id: providerId, payment_page_id: paymentPageId,
      amount_cents: tariff.amount_cents, currency: tariff.currency, subtotal: tariff.amount_cents, total_amount: tariff.amount_cents, status: 'pending',
      buyer_email: buyerEmail, buyer_phone: buyerPhone, buyer_name: buyerName, customer_email: buyerEmail, customer_phone: buyerPhone,
      customer_first_name: body.firstName ? String(body.firstName).slice(0, 80) : null, customer_last_name: body.lastName ? String(body.lastName).slice(0, 80) : null,
      product_label: tariff.product_label || tariff.name, metadata: { checkout_source: 'conik_checkout', method_code: methodCode },
    }).select('id,order_number,amount_cents,total_amount,currency,status,payment_page_id').single()
    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 })

    const { data: transaction, error: transactionError } = await supabase.from('payment_transactions').insert({
      organization_id: tariff.organization_id, order_id: order.id, provider_id: providerId,
      amount: Number((tariff.amount_cents / 100).toFixed(2)), currency: tariff.currency, status: 'pending', provider_transaction_id: null,
      method_code: methodCode, raw_response: null,
    }).select('id,order_id,provider_id,amount,currency,status,provider_transaction_id,method_code,created_at').single()

    if (transactionError) {
      await supabase.from('payment_orders').delete().eq('id', order.id)
      return NextResponse.json({ error: transactionError.message }, { status: 400 })
    }

    return NextResponse.json({ order, transaction, message: 'Commande créée. Initialisez maintenant la transaction auprès du prestataire.' }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur paiement' }, { status: 500 })
  }
}
