import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Après un paiement réussi, active (ou crée) product_access pour le produit
 * référencé dans order.metadata.product_id ou via tariff_id.
 */
export async function grantProductAccessOnPaid(
  supabase: SupabaseClient,
  order: {
    id: string
    organization_id: string
    metadata?: Record<string, unknown> | null
    tariff_id?: string | null
    customer_email?: string | null
    buyer_email?: string | null
    customer_first_name?: string | null
    customer_last_name?: string | null
    customer_phone?: string | null
    buyer_phone?: string | null
  },
) {
  const meta = (order.metadata || {}) as Record<string, unknown>
  let productId = meta.product_id ? String(meta.product_id) : null

  if (!productId && order.tariff_id) {
    const { data: product } = await supabase
      .from('digital_products')
      .select('id')
      .eq('tariff_id', order.tariff_id)
      .eq('organization_id', order.organization_id)
      .maybeSingle()
    productId = product?.id || null
  }

  if (!productId) return null

  const email = (order.buyer_email || order.customer_email || '').trim().toLowerCase()
  if (!email) return null

  // Prefer activating existing pending access for this order
  const { data: existing } = await supabase
    .from('product_access')
    .select('id,access_token,status')
    .eq('order_id', order.id)
    .eq('product_id', productId)
    .maybeSingle()

  if (existing) {
    if (existing.status !== 'active') {
      await supabase
        .from('product_access')
        .update({ status: 'active', granted_at: new Date().toISOString() })
        .eq('id', existing.id)
    }
    return { ...existing, status: 'active' as const, product_id: productId }
  }

  const { data: access, error } = await supabase
    .from('product_access')
    .insert({
      organization_id: order.organization_id,
      product_id: productId,
      order_id: order.id,
      buyer_email: email,
      buyer_first_name: order.customer_first_name || null,
      buyer_last_name: order.customer_last_name || null,
      buyer_phone: order.buyer_phone || order.customer_phone || null,
      status: 'active',
      metadata: { source: 'funnel_payment' },
    })
    .select('id,access_token,status')
    .single()

  if (error) {
    console.error('grantProductAccessOnPaid', error.message)
    return null
  }
  return { ...access, product_id: productId }
}
