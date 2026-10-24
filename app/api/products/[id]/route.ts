import { NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { PRODUCT_TYPES, slugify, type ProductType } from '@/lib/products/types'
import { buildBuyLink, syncProductTariff } from '@/lib/products/sync-tariff'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

async function attachBuyLink(
  supabase: Awaited<ReturnType<typeof requireWorkspaceRole>>['supabase'],
  product: Record<string, unknown>,
  origin: string,
) {
  if (!product.funnel_id || !product.tariff_id) {
    return { product, buy_link: null as string | null, funnel_slug: null as string | null, tariff_slug: null as string | null }
  }
  const [{ data: funnel }, { data: tariff }] = await Promise.all([
    supabase.from('funnels').select('slug').eq('id', product.funnel_id).maybeSingle(),
    supabase.from('payment_tariffs').select('slug').eq('id', product.tariff_id).maybeSingle(),
  ])
  if (!funnel?.slug || !tariff?.slug) {
    return { product, buy_link: null, funnel_slug: null, tariff_slug: null }
  }
  return {
    product,
    buy_link: buildBuyLink(origin, funnel.slug, tariff.slug),
    funnel_slug: funnel.slug as string,
    tariff_slug: tariff.slug as string,
  }
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor', 'viewer'])
  const { data, error } = await supabase
    .from('digital_products')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organization.id)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
  const origin = new URL(request.url).origin
  const enriched = await attachBuyLink(supabase, data, origin)
  return NextResponse.json(enriched)
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('digital_products')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organization.id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

  const patch: Record<string, unknown> = {}
  if (body.name != null) patch.name = String(body.name).trim().slice(0, 160)
  if (body.description !== undefined) {
    patch.description = body.description ? String(body.description).slice(0, 5000) : null
  }
  if (body.product_type != null) {
    const t = String(body.product_type) as ProductType
    if (!PRODUCT_TYPES.includes(t)) {
      return NextResponse.json({ error: 'Type de produit invalide.' }, { status: 400 })
    }
    patch.product_type = t
  }
  if (body.currency != null) patch.currency = String(body.currency).toUpperCase().slice(0, 3)
  if (body.price_cents != null || body.price != null) {
    patch.price_cents = Math.max(0, Math.round(Number(body.price_cents ?? body.price ?? 0)))
  }
  if (body.attributes && typeof body.attributes === 'object') patch.attributes = body.attributes
  if (body.delivery && typeof body.delivery === 'object') patch.delivery = body.delivery
  if (body.cover_url !== undefined) patch.cover_url = body.cover_url ? String(body.cover_url).slice(0, 2000) : null
  if (body.funnel_id !== undefined) patch.funnel_id = body.funnel_id || null
  if (body.payment_provider_id !== undefined) patch.payment_provider_id = body.payment_provider_id || null
  if (body.payment_page_id !== undefined) patch.payment_page_id = body.payment_page_id || null
  if (Array.isArray(body.enabled_methods)) patch.enabled_methods = body.enabled_methods
  if (body.success_message !== undefined) {
    patch.success_message = body.success_message ? String(body.success_message).slice(0, 2000) : null
  }
  if (body.slug != null) {
    const nextSlug = slugify(String(body.slug))
    if (nextSlug !== existing.slug) {
      const { data: clash } = await supabase
        .from('digital_products')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('slug', nextSlug)
        .neq('id', id)
        .maybeSingle()
      if (clash) return NextResponse.json({ error: 'Ce slug est déjà utilisé.' }, { status: 409 })
      patch.slug = nextSlug
    }
  }
  if (body.status === 'published' || body.status === 'draft' || body.status === 'archived') {
    patch.status = body.status
    if (body.status === 'published' && existing.status !== 'published') {
      patch.published_at = new Date().toISOString()
    }
  }

  const { data: updated, error } = await supabase
    .from('digital_products')
    .update(patch)
    .eq('id', id)
    .eq('organization_id', organization.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  let product = updated
  const funnelId = (product.funnel_id as string | null) || null

  // Sync tariff so the product can be sold via the funnel payment page
  if (funnelId) {
    try {
      const { tariff } = await syncProductTariff(supabase, {
        organizationId: organization.id,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        funnelId,
        priceCents: product.price_cents,
        currency: product.currency,
        existingTariffId: product.tariff_id,
      })
      if (tariff?.id && tariff.id !== product.tariff_id) {
        const { data: withTariff } = await supabase
          .from('digital_products')
          .update({ tariff_id: tariff.id })
          .eq('id', product.id)
          .select('*')
          .single()
        if (withTariff) product = withTariff
      }
    } catch (e) {
      return NextResponse.json({
        error: e instanceof Error ? e.message : 'Impossible de lier le tarif au tunnel',
        product,
      }, { status: 400 })
    }
  }

  const origin = new URL(request.url).origin
  const enriched = await attachBuyLink(supabase, product, origin)
  return NextResponse.json(enriched)
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const { error } = await supabase
    .from('digital_products')
    .delete()
    .eq('id', id)
    .eq('organization_id', organization.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
