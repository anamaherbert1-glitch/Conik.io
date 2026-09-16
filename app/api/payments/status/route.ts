import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const orderNumber = new URL(request.url).searchParams.get('order')?.trim()
  if (!orderNumber) return NextResponse.json({ error: 'order requis' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: order, error } = await supabase
    .from('payment_orders')
    .select('id,order_number,status,paid_at,total_amount,currency,product_label')
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

  return NextResponse.json({ order, transaction: transaction || null })
}
