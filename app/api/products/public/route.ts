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
      .select('id,organization_id,name,slug,description,product_type,status,currency,price_cents,attributes,cover_url,funnel_id,payment_provider_id,payment_page_id,enabled_methods,success_message')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!product) return NextResponse.json({ error: 'Produit introuvable ou non publié' }, { status: 404 })

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

    // Never expose delivery URLs before payment
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
    return NextResponse.json({ error: 'Prénom, nom et e-mail sont requis.' }, { status: 400 })
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
      return NextResponse.json({ error: 'Aucun prestataire de paiement configuré pour ce produit.' }, { status: 400 })
    }

    const { data: provider } = await supabase
      .from('payment_providers')
      .select('id,status')
      .eq('id', providerId)
      .eq('organization_id', product.organization_id)
      .maybeSingle()
    if (!provider || !['connected', 'active'].includes(provider.status)) {
      return NextResponse.json({ error: 'Prestataire de paiement inactif.' }, { status: 400 })
    }

    const isMinor = !['XOF', 'XAF'].includes(String(product.currency).toUpperCase())
    const orderAmount = product.price_cents
    const transactionAmount = isMinor ? Number((product.price_cents / 100).toFixed(2)) : product.price_cents

    const orderNumber = `P-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .insert({
        organization_id: product.organization_id,
        payment_page_id: product.payment_page_id || null,
        funnel_id: product.funnel_id || null,
        order_number: orderNumber,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_email: email,
        customer_phone: phone,
        buyer_email: email,
        buyer_phone: phone,
        buyer_name: `${firstName} ${lastName}`.trim(),
        currency: product.currency,
        subtotal: orderAmount,
        total_amount: orderAmount,
        amount_cents: orderAmount,
        status: 'pending',
        product_label: product.name,
        metadata: {
          product_id: product.id,
          product_slug: product.slug,
          product_type: product.product_type,
          method_code: methodCode,
          source: 'digital_product',
        },
      })
      .select('id,order_number,status,total_amount,currency')
      .single()

    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 })

    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .insert({
        organization_id: product.organization_id,
        order_id: order.id,
        payment_provider_id: providerId,
        provider_id: providerId,
        provider_code: 'unknown',
        method_code: methodCode || 'default',
        idempotency_key: `prod-${product.id}-${order.id}`,
        amount: transactionAmount,
        currency: product.currency,
        status: 'pending',
      })
      .select('id,order_id,status')
      .single()

    if (txError) {
      await supabase.from('payment_orders').delete().eq('id', order.id)
      return NextResponse.json({ error: txError.message }, { status: 400 })
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
        metadata: { method_code: methodCode },
      })
      .select('id,access_token,status')
      .single()

    return NextResponse.json({
      order,
      transaction,
      access,
      message: 'Commande créée. Initialisez le paiement auprès du prestataire.',
    }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
