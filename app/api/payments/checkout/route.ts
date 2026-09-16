import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/** Public : charge un tarif + page de paiement pour afficher le checkout préconfiguré */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const funnelSlug = url.searchParams.get('funnel')
  const tariffSlug = url.searchParams.get('tarif')
  if (!funnelSlug || !tariffSlug) {
    return NextResponse.json({ error: 'Paramètres funnel et tarif requis' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: funnel } = await supabase
      .from('funnels')
      .select('id,name,slug,organization_id,payment_enabled,payment_html,payment_css,payment_js,payment_provider_id,status')
      .eq('slug', funnelSlug)
      .maybeSingle()

    if (!funnel || funnel.status !== 'published') {
      return NextResponse.json({ error: 'Tunnel introuvable ou non publié' }, { status: 404 })
    }
    if (!funnel.payment_enabled || !funnel.payment_html) {
      return NextResponse.json({ error: 'Page de paiement non configurée' }, { status: 404 })
    }

    const { data: tariff } = await supabase
      .from('payment_tariffs')
      .select('id,name,amount_cents,currency,slug,product_label,active')
      .eq('funnel_id', funnel.id)
      .eq('slug', tariffSlug)
      .eq('active', true)
      .maybeSingle()

    if (!tariff) return NextResponse.json({ error: 'Tarif introuvable' }, { status: 404 })

    let provider: { id: string; provider: string; label: string } | null = null
    if (funnel.payment_provider_id) {
      const { data: p } = await supabase
        .from('payment_providers')
        .select('id,provider,label,status')
        .eq('id', funnel.payment_provider_id)
        .maybeSingle()
      if (p && p.status === 'connected') provider = { id: p.id, provider: p.provider, label: p.label }
    }

    return NextResponse.json({
      funnel: { id: funnel.id, name: funnel.name, slug: funnel.slug },
      tariff,
      provider,
      page: {
        html: funnel.payment_html,
        css: funnel.payment_css || '',
        js: funnel.payment_js || '',
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur paiement' },
      { status: 500 },
    )
  }
}

/** Crée une commande pending (API Wave/CinetPay à brancher ensuite) */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.funnelId || !body?.tariffId) {
    return NextResponse.json({ error: 'funnelId et tariffId requis' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: tariff } = await supabase
      .from('payment_tariffs')
      .select('id,funnel_id,organization_id,amount_cents,currency,name,active')
      .eq('id', body.tariffId)
      .maybeSingle()
    if (!tariff || !tariff.active) return NextResponse.json({ error: 'Tarif invalide' }, { status: 404 })

    const { data: funnel } = await supabase
      .from('funnels')
      .select('id,payment_provider_id,payment_enabled')
      .eq('id', tariff.funnel_id)
      .maybeSingle()
    if (!funnel?.payment_enabled) return NextResponse.json({ error: 'Paiement désactivé' }, { status: 400 })

    const { data: order, error } = await supabase
      .from('payment_orders')
      .insert({
        organization_id: tariff.organization_id,
        funnel_id: tariff.funnel_id,
        tariff_id: tariff.id,
        provider_id: funnel.payment_provider_id,
        amount_cents: tariff.amount_cents,
        currency: tariff.currency,
        status: 'pending',
        buyer_email: body.email ? String(body.email).slice(0, 320) : null,
        buyer_phone: body.phone ? String(body.phone).slice(0, 40) : null,
        buyer_name: body.name ? String(body.name).slice(0, 160) : null,
        metadata: { note: 'Commande créée — appel API prestataire à brancher' },
      })
      .select('id,amount_cents,currency,status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(
      {
        order,
        message:
          'Commande enregistrée. Le paiement réel via le prestataire sera branché à l’étape suivante.',
      },
      { status: 201 },
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur paiement' },
      { status: 500 },
    )
  }
}
