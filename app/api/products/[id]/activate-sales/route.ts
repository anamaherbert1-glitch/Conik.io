import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { buildBuyLink, syncProductTariff } from '@/lib/products/sync-tariff'
import { slugify } from '@/lib/products/types'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: Params) {
  const { id } = await params
  const { supabase, organization, user } = await requireWorkspaceRole(['owner', 'admin', 'editor'])

  const { data: product, error } = await supabase
    .from('digital_products')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organization.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!product) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

  let funnelId = product.funnel_id as string | null

  if (!funnelId) {
    let base = slugify(`vente-${product.slug || product.name}`).slice(0, 50)
    let funnelSlug = base
    for (let i = 0; i < 8; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`
      const { data: existing } = await supabase
        .from('funnels')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('slug', candidate)
        .maybeSingle()
      if (!existing) {
        funnelSlug = candidate
        break
      }
    }

    const { data: funnel, error: funnelError } = await supabase
      .from('funnels')
      .insert({
        organization_id: organization.id,
        name: `Vente \u2014 ${String(product.name).slice(0, 100)}`,
        slug: funnelSlug,
        description: product.description ? String(product.description).slice(0, 500) : null,
        status: 'published',
        source: 'product',
        created_by: user.id,
      })
      .select('id,slug')
      .single()

    if (funnelError || !funnel) {
      return NextResponse.json(
        { error: funnelError?.message || 'Impossible de cr\u00e9er le tunnel de vente.' },
        { status: 400 },
      )
    }
    funnelId = funnel.id
  }

  let tariffId = product.tariff_id as string | null
  let funnelSlug = ''
  let tariffSlug = ''
  try {
    const synced = await syncProductTariff(supabase, {
      organizationId: organization.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      funnelId,
      priceCents: product.price_cents || 0,
      currency: product.currency || 'XOF',
      existingTariffId: tariffId,
    })
    tariffId = synced.tariff.id
    funnelSlug = synced.funnelSlug
    tariffSlug = synced.tariff.slug
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Impossible de cr\u00e9er le tarif de paiement.' },
      { status: 400 },
    )
  }

  const { data: updated, error: updateError } = await supabase
    .from('digital_products')
    .update({
      funnel_id: funnelId,
      tariff_id: tariffId,
      status: 'published',
      published_at: product.published_at || new Date().toISOString(),
    })
    .eq('id', product.id)
    .eq('organization_id', organization.id)
    .select('*')
    .single()

  if (updateError || !updated) {
    return NextResponse.json(
      { error: updateError?.message || 'Publication impossible.' },
      { status: 400 },
    )
  }

  await supabase
    .from('funnels')
    .update({ status: 'published' })
    .eq('id', funnelId)
    .eq('organization_id', organization.id)

  if (!funnelSlug || !tariffSlug) {
    const [{ data: f }, { data: t }] = await Promise.all([
      supabase.from('funnels').select('slug').eq('id', funnelId).maybeSingle(),
      supabase.from('payment_tariffs').select('slug').eq('id', tariffId).maybeSingle(),
    ])
    funnelSlug = f?.slug || funnelSlug
    tariffSlug = t?.slug || tariffSlug
  }

  const origin = new URL(request.url).origin
  const buy_link = funnelSlug && tariffSlug ? buildBuyLink(origin, funnelSlug, tariffSlug) : null
  const store_link = `${origin.replace(/\/$/, '')}/p/${updated.slug}`

  return NextResponse.json({
    product: updated,
    buy_link,
    store_link,
    funnel_id: funnelId,
    tariff_id: tariffId,
  })
}
