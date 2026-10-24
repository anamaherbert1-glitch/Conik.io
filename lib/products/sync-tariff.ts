import type { SupabaseClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/products/types'

/**
 * Crée ou met à jour le tarif de paiement du tunnel lié au produit.
 * Le lien acheteur sera : /pay?funnel={funnelSlug}&tarif={tariffSlug}
 */
export async function syncProductTariff(
  supabase: SupabaseClient,
  opts: {
    organizationId: string
    productId: string
    productName: string
    productSlug: string
    funnelId: string
    priceCents: number
    currency: string
    existingTariffId?: string | null
  },
) {
  const { data: funnel } = await supabase
    .from('funnels')
    .select('id,slug,organization_id')
    .eq('id', opts.funnelId)
    .eq('organization_id', opts.organizationId)
    .maybeSingle()

  if (!funnel) {
    throw new Error('Tunnel introuvable pour ce produit.')
  }

  const tariffSlug = slugify(`prod-${opts.productSlug}`).slice(0, 40)
  const row = {
    organization_id: opts.organizationId,
    funnel_id: opts.funnelId,
    name: opts.productName.slice(0, 120),
    amount_cents: Math.max(0, opts.priceCents),
    currency: String(opts.currency || 'XOF').toUpperCase().slice(0, 8),
    slug: tariffSlug,
    product_label: opts.productName.slice(0, 200),
    active: true,
  }

  if (opts.existingTariffId) {
    const { data: updated, error } = await supabase
      .from('payment_tariffs')
      .update(row)
      .eq('id', opts.existingTariffId)
      .eq('organization_id', opts.organizationId)
      .select('id,name,slug,amount_cents,currency,active')
      .maybeSingle()
    if (!error && updated) {
      return { tariff: updated, funnelSlug: funnel.slug as string }
    }
  }

  // Try find by slug on this funnel
  const { data: existing } = await supabase
    .from('payment_tariffs')
    .select('id')
    .eq('funnel_id', opts.funnelId)
    .eq('organization_id', opts.organizationId)
    .eq('slug', tariffSlug)
    .maybeSingle()

  if (existing) {
    const { data: updated, error } = await supabase
      .from('payment_tariffs')
      .update(row)
      .eq('id', existing.id)
      .select('id,name,slug,amount_cents,currency,active')
      .single()
    if (error) throw new Error(error.message)
    return { tariff: updated, funnelSlug: funnel.slug as string }
  }

  const { data: created, error } = await supabase
    .from('payment_tariffs')
    .insert(row)
    .select('id,name,slug,amount_cents,currency,active')
    .single()
  if (error) throw new Error(error.message)
  return { tariff: created, funnelSlug: funnel.slug as string }
}

export function buildBuyLink(origin: string, funnelSlug: string, tariffSlug: string) {
  const base = origin.replace(/\/$/, '')
  return `${base}/pay?funnel=${encodeURIComponent(funnelSlug)}&tarif=${encodeURIComponent(tariffSlug)}`
}
