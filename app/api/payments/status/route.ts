import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { grantProductAccessOnPaid } from '@/lib/products/grant-access'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const orderNumber = new URL(request.url).searchParams.get('order')?.trim()
  if (!orderNumber) return NextResponse.json({ error: 'order requis' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: order, error } = await supabase
    .from('payment_orders')
    .select('id,organization_id,order_number,status,paid_at,total_amount,currency,product_label,metadata,tariff_id,customer_email,buyer_email,customer_first_name,customer_last_name,customer_phone,buyer_phone')
    .eq('order_number', orderNumber)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  const { data: transaction } = await supabase
    .from('payment_transactions')
    .select('status,method_code,provider_transaction_id,updated_at')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const paid =
    order.status === 'paid' ||
    transaction?.status === 'succeeded' ||
    transaction?.status === 'paid'

  let delivery: {
    access_token?: string
    product_slug?: string
    product_name?: string
    file_url?: string
    video_url?: string
    course_url?: string
    instructions?: string
    success_message?: string | null
  } | null = null

  if (paid) {
    const access = await grantProductAccessOnPaid(supabase, order)
    if (access?.product_id) {
      const { data: product } = await supabase
        .from('digital_products')
        .select('name,slug,delivery,success_message')
        .eq('id', access.product_id)
        .maybeSingle()
      if (product) {
        const d = (product.delivery || {}) as Record<string, string>
        delivery = {
          access_token: access.access_token,
          product_slug: product.slug,
          product_name: product.name,
          file_url: d.file_url,
          video_url: d.video_url,
          course_url: d.course_url,
          instructions: d.instructions,
          success_message: product.success_message,
        }
      }
    }
  }

  return NextResponse.json({ order, transaction: transaction || null, delivery })
}
