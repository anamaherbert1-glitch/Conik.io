import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/** GET ?slug=xxx — public product page data */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug requis' }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const { data: product, error } = await supabase
      .from('digital_products')
      .select('id,organization_id,name,slug,description,product_type,status,currency,price_cents,attributes,cover_url,funnel_id,tariff_id,payment_provider_id,payment_page_id,enabled_methods,success_message')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!product) return NextResponse.json({ error: 'Produit introuvable ou non publi\u00e9' }, { status: 404 })

    let provider: { id: string; provider: string; label: string; status: string } | null = null
    if (product.payment_provider_id) {
      const { data: p } = await supabase
        .from('payment_providers')
        .select('id,provider,label,status')
        .eq('id', product.payment_provider_id)
        .eq('organization_id', product.organization_id)
        .maybeSingle()
      if (p && ['connected', 'active'].includes(p.status)) provider = p
    }

    let methods: Array<{
      id: string
      method_code: string
      display_name: string
      provider_id: string
      enabled: boolean
    }> = []

    if (product.payment_page_id) {
      const { data } = await supabase
        .from('payment_page_methods')
        .select('id,method_code,display_name,provider_id,enabled')
        .eq('payment_page_id', product.payment_page_id)
        .eq('enabled', true)
      methods = data || []
    }

    const enabled = Array.isArray(product.enabled_methods) ? product.enabled_methods : []
    if (enabled.length) {
      methods = methods.filter((m) => enabled.includes(m.method_code))
    }

    let buy_link: string | null = null
    if (product.funnel_id && product.tariff_id) {
      const [{ data: funnel }, { data: tariff }] = await Promise.all([
        supabase.from('funnels').select('slug').eq('id', product.funnel_id).maybeSingle(),
        supabase.from('payment_tariffs').select('slug').eq('id', product.tariff_id).maybeSingle(),
      ])
      if (funnel?.slug && tariff?.slug) {
        const origin = new URL(request.url).origin
        buy_link = `${origin}/pay?funnel=${encodeURIComponent(funnel.slug)}&tarif=${encodeURIComponent(tariff.slug)}`
      }
    }

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        product_type: product.product_type,
        currency: product.currency,
        price_cents: product.price_cents,
        attributes: product.attributes,
        cover_url: product.cover_url,
        success_message: product.success_message,
      },
      provider,
      methods,
      buy_link,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}

/** POST — create order + grant pending access for a published product */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.productId) return NextResponse.json({ error: 'productId requis' }, { status: 400 })

  const firstName = body.firstName ? String(body.firstName).slice(0, 80) : ''
  const lastName = body.lastName ? String(body.lastName).slice(0, 80) : ''
  const email = body.email ? String(body.email).trim().toLowerCase().slice(0, 320) : ''
  const phone = body.phone ? String(body.phone).slice(0, 40) : null
  const methodCode = body.methodCode ? String(body.methodCode).slice(0, 100) : null

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: 'Pr\u00e9nom, nom et e-mail sont requis.' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: product } = await supabase
      .from('digital_products')
      .select('*')
      .eq('id', body.productId)
      .eq('status', 'published')
      .maybeSingle()
    if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

    let providerId = product.payment_provider_id as string | null
    if (methodCode && product.payment_page_id) {
      const { data: method } = await supabase
        .from('payment_page_methods')
        .select('provider_id,method_code')
        .eq('payment_page_id', product.payment_page_id)
        .eq('method_code', methodCode)
        .eq('enabled', true)
        .maybeSingle()
      if (!method) return NextResponse.json({ error: 'Moyen de paiement indisponible.' }, { status: 400 })
      providerId = method.provider_id
    }
    if (!providerId) {
      return NextResponse.json({ error: 'Aucun prestataire de paiement configur\u00e9 pour ce produit.' }, { status: 400 })
    }

    const { data: provider } = await supabase
      .from('payment_providers')
      .select('id,provider,status')
      .eq('id', providerId)
      .eq('organization_id', product.organization_id)
      .maybeSingle()
    if (!provider || !['connected', 'active'].includes(provider.status)) {
      return NextResponse.json({ error: 'Prestataire de paiement indisponible.' }, { status: 400 })
    }

    const amount = Math.max(0, Number(product.price_cents || 0))
    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .insert({
        organization_id: product.organization_id,
        funnel_id: product.funnel_id,
        provider_id: providerId,
        amount_cents: amount,
        currency: product.currency || 'XOF',
        status: 'pending',
        buyer_email: email,
        buyer_phone: phone,
        buyer_name: `${firstName} ${lastName}`.trim(),
        product_label: product.name,
        metadata: { product_id: product.id, source: 'public_product_page' },
      })
      .select('*')
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: orderError?.message || 'Commande impossible' }, { status: 400 })
    }

    const { data: access } = await supabase
      .from('product_access')
      .insert({
        organization_id: product.organization_id,
        product_id: product.id,
        order_id: order.id,
        buyer_email: email,
        buyer_first_name: firstName,
        buyer_last_name: lastName,
        buyer_phone: phone,
        status: 'pending',
        metadata: { source: 'public_checkout' },
      })
      .select('id,access_token,status')
      .maybeSingle()

    const { data: transaction } = await supabase
      .from('payment_transactions')
      .insert({
        organization_id: product.organization_id,
        order_id: order.id,
        provider_id: providerId,
        amount_cents: amount,
        currency: product.currency || 'XOF',
        status: 'pending',
        method_code: methodCode,
      })
      .select('id')
      .maybeSingle()

    return NextResponse.json({
      order,
      access,
      transaction,
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
