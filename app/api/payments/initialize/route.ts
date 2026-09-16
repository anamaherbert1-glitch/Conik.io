import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { initializeProviderPayment } from '@/lib/payments/provider-adapters'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.transactionId || !body?.methodCode) return NextResponse.json({ error: 'transactionId et methodCode requis' }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .select('id,organization_id,order_id,provider_id,amount,currency,status,order:payment_orders(id,order_number,amount_cents,product_label,buyer_name,buyer_email,buyer_phone,customer_first_name,customer_last_name)')
      .eq('id', String(body.transactionId))
      .maybeSingle()

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })
    if (!transaction) return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
    if (!['pending', 'processing'].includes(transaction.status)) return NextResponse.json({ error: 'Cette transaction ne peut plus être initialisée.' }, { status: 409 })
    if (!transaction.provider_id) return NextResponse.json({ error: 'Aucun prestataire de paiement configuré.' }, { status: 400 })

    const { data: provider } = await supabase
      .from('payment_providers')
      .select('id,provider,credentials,public_config,status')
      .eq('id', transaction.provider_id)
      .eq('organization_id', transaction.organization_id)
      .maybeSingle()

    if (!provider || !['connected', 'active'].includes(provider.status)) return NextResponse.json({ error: 'Prestataire non connecté ou inactif.' }, { status: 400 })

    const order = Array.isArray(transaction.order) ? transaction.order[0] : transaction.order
    if (!order) return NextResponse.json({ error: 'Commande liée introuvable.' }, { status: 404 })

    const { data: method } = await supabase
      .from('payment_page_methods')
      .select('id,payment_page_id,provider_id,method_code,display_name,enabled,config')
      .eq('provider_id', provider.id)
      .eq('method_code', String(body.methodCode))
      .eq('enabled', true)
      .maybeSingle()

    if (!method) return NextResponse.json({ error: 'Moyen de paiement non disponible pour ce prestataire.' }, { status: 400 })

    const origin = new URL(request.url).origin
    const result = await initializeProviderPayment({
      provider,
      methodCode: method.method_code,
      orderId: order.id,
      orderNumber: order.order_number,
      amountCents: order.amount_cents,
      currency: transaction.currency.trim(),
      productLabel: order.product_label || 'Paiement Conik',
      customer: {
        name: order.buyer_name,
        firstName: order.customer_first_name,
        lastName: order.customer_last_name,
        email: order.buyer_email,
        phone: order.buyer_phone,
      },
      baseUrl: origin,
    })

    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        provider_transaction_id: result.providerTransactionId,
        method_code: method.method_code,
        status: result.status,
        raw_response: result.rawResponse,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    await supabase.from('payment_orders').update({ provider_ref: result.providerTransactionId, status: 'processing', updated_at: new Date().toISOString() }).eq('id', order.id)

    return NextResponse.json({ transactionId: transaction.id, provider: provider.provider, method: method.method_code, status: result.status, paymentUrl: result.paymentUrl || null })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Initialisation du paiement impossible.'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
