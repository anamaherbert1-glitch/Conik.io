import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')
  const token = url.searchParams.get('token')
  if (!slug || !token) {
    return NextResponse.json({ error: 'slug et token requis' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data: access, error } = await supabase
      .from('product_access')
      .select('id,product_id,status,expires_at,buyer_email,order_id')
      .eq('access_token', token)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!access) return NextResponse.json({ error: 'Accès introuvable' }, { status: 404 })

    if (access.expires_at && new Date(access.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Accès expiré' }, { status: 403 })
    }

    const { data: product } = await supabase
      .from('digital_products')
      .select('id,name,slug,product_type,delivery,success_message,status')
      .eq('id', access.product_id)
      .maybeSingle()
    if (!product || product.slug !== slug) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    }

    // If still pending, check order payment status
    let status = access.status
    if (status === 'pending' && access.order_id) {
      const { data: order } = await supabase
        .from('payment_orders')
        .select('status')
        .eq('id', access.order_id)
        .maybeSingle()
      if (order?.status === 'paid') {
        await supabase.from('product_access').update({ status: 'active' }).eq('id', access.id)
        status = 'active'
      }
    }

    if (status === 'revoked') {
      return NextResponse.json({ error: 'Accès révoqué' }, { status: 403 })
    }

    // Only reveal delivery when active (paid) or still pending (show instructions)
    const delivery =
      status === 'active'
        ? product.delivery || {}
        : { instructions: 'Paiement en cours de confirmation. Les fichiers seront disponibles dès validation.' }

    return NextResponse.json({
      status,
      product: { name: product.name, product_type: product.product_type },
      delivery,
      success_message: product.success_message,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
