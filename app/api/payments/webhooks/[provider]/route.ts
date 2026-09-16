import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractProviderReference, mapProviderStatus } from '@/lib/payments/provider-adapters'

export const runtime = 'nodejs'

async function readBody(request: Request) {
  const text = await request.text()
  if (!text) return {}
  try { return JSON.parse(text) } catch { return Object.fromEntries(new URLSearchParams(text)) }
}

async function verifyProvider(provider: any, reference: string, transaction: any) {
  const credentials = (provider.credentials || {}) as Record<string, string>
  const expectedAmount = Number(transaction.amount)
  const currency = String(transaction.currency).trim()

  if (provider.provider === 'cinetpay') {
    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apikey: credentials.apikey, site_id: credentials.site_id, transaction_id: reference }) })
    const data = await response.json().catch(() => ({}))
    const status = mapProviderStatus(data?.data || data)
    const amount = Number(data?.data?.amount)
    if (status === 'succeeded' && (!Number.isFinite(amount) || Math.abs(amount - expectedAmount) > 0.01 || String(data?.data?.currency || '').trim() !== currency)) throw new Error('CinetPay: montant ou devise non conforme.')
    return { status, raw: data }
  }

  if (provider.provider === 'flutterwave') {
    if (!credentials.secret_key) throw new Error('Flutterwave: Secret Key manquante.')
    const providerId = /^\d+$/.test(String(transaction.provider_transaction_id || '')) ? transaction.provider_transaction_id : reference
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(providerId)}/verify`, { headers: { Authorization: `Bearer ${credentials.secret_key}` } })
    const data = await response.json().catch(() => ({}))
    const status = mapProviderStatus(data?.data || data)
    const amount = Number(data?.data?.amount)
    const txRef = data?.data?.tx_ref
    if (status === 'succeeded' && (txRef !== transaction.order?.order_number || !Number.isFinite(amount) || amount < expectedAmount || String(data?.data?.currency || '').trim() !== currency)) throw new Error('Flutterwave: transaction vérifiée mais montant/devise/référence non conformes.')
    return { status, raw: data }
  }

  if (provider.provider === 'paydunya') {
    if (!credentials.master_key || !credentials.private_key || !credentials.token) throw new Error('PayDunya: clés manquantes.')
    const sandbox = String(provider.public_config?.environment || '').toLowerCase() === 'sandbox' || String(credentials.private_key).startsWith('test_')
    const endpoint = sandbox ? `https://app.paydunya.com/sandbox-api/v1/checkout-invoice/confirm/${encodeURIComponent(reference)}` : `https://app.paydunya.com/api/v1/checkout-invoice/confirm/${encodeURIComponent(reference)}`
    const response = await fetch(endpoint, { headers: { 'Content-Type': 'application/json', 'PAYDUNYA-MASTER-KEY': credentials.master_key, 'PAYDUNYA-PRIVATE-KEY': credentials.private_key, 'PAYDUNYA-TOKEN': credentials.token } })
    const data = await response.json().catch(() => ({}))
    const invoice = data?.invoice || {}
    const status = mapProviderStatus(invoice) || mapProviderStatus(data)
    const amount = Number(invoice?.total_amount || invoice?.total)
    if (status === 'succeeded' && Number.isFinite(amount) && Math.abs(amount - expectedAmount) > 0.01) throw new Error('PayDunya: montant non conforme.')
    return { status, raw: data }
  }

  if (provider.provider === 'fedapay') {
    if (!credentials.secret_key) throw new Error('FedaPay: clé secrète manquante.')
    const environment = String(provider.public_config?.environment || 'live').toLowerCase()
    const apiBase = environment === 'sandbox' ? 'https://sandbox-api.fedapay.com/v1' : 'https://api.fedapay.com/v1'
    const response = await fetch(`${apiBase}/transactions/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${credentials.secret_key}` } })
    const data = await response.json().catch(() => ({}))
    const object = data?.data || data
    const status = mapProviderStatus(object)
    const amount = Number(object?.amount)
    if (status === 'succeeded' && (!Number.isFinite(amount) || Math.abs(amount - expectedAmount) > 0.01 || String(object?.currency?.iso || object?.currency || '').trim() !== currency)) throw new Error('FedaPay: montant ou devise non conforme.')
    return { status, raw: data }
  }

  return { status: mapProviderStatus(transaction), raw: transaction }
}

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerName } = await params
  const payload = await readBody(request)

  try {
    const supabase = createAdminClient()
    const { data: providers } = await supabase.from('payment_providers').select('id,organization_id,provider,credentials,public_config,status').eq('provider', providerName)
    if (!providers?.length) return NextResponse.json({ received: true, ignored: true }, { status: 200 })

    const reference = extractProviderReference(providerName, payload)
    if (!reference) return NextResponse.json({ error: 'Référence de transaction absente.' }, { status: 400 })

    for (const provider of providers) {
      let { data: transaction } = await supabase.from('payment_transactions').select('id,organization_id,provider_id,order_id,provider_transaction_id,amount,currency,status,order:payment_orders(id,order_number,status,paid_at)').eq('provider_id', provider.id).eq('provider_transaction_id', reference).maybeSingle()
      if (!transaction && providerName === 'cinetpay') {
        const { data: byOrder } = await supabase.from('payment_orders').select('id,order_number').eq('organization_id', provider.organization_id).eq('order_number', reference).maybeSingle()
        if (byOrder) {
          const { data: tx } = await supabase.from('payment_transactions').select('id,organization_id,provider_id,order_id,provider_transaction_id,amount,currency,status,order:payment_orders(id,order_number,status,paid_at)').eq('provider_id', provider.id).eq('order_id', byOrder.id).maybeSingle()
          transaction = tx
        }
      }
      if (!transaction) continue

      const eventId = String(request.headers.get('x-webhook-id') || payload?.webhook_id || payload?.id || `${providerName}:${reference}:${payload?.status || payload?.event || payload?.type || 'event'}`)
      const signature = request.headers.get('verif-hash') || request.headers.get('x-token') || request.headers.get('x-fedapay-signature')
      const { data: existingEvent } = await supabase.from('payment_webhook_events').select('id,processed').eq('provider_id', provider.id).eq('event_id', eventId).maybeSingle()
      if (existingEvent?.processed) return NextResponse.json({ received: true, duplicate: true }, { status: 200 })

      const { data: eventRow, error: eventError } = await supabase.from('payment_webhook_events').upsert({ organization_id: provider.organization_id, provider_id: provider.id, event_id: eventId, event_type: String(payload?.event || payload?.type || payload?.name || payload?.status || 'payment.update'), payload, signature, processed: false }, { onConflict: 'provider_id,event_id' }).select('id').maybeSingle()
      if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 })

      try {
        const verification = await verifyProvider(provider, reference, transaction)
        const status = verification.status
        if (!status) {
          if (eventRow?.id) await supabase.from('payment_webhook_events').update({ processed: true, processed_at: new Date().toISOString() }).eq('id', eventRow.id)
          return NextResponse.json({ received: true, pending: true }, { status: 200 })
        }

        const txStatus = status === 'succeeded' ? 'succeeded' : status
        const orderStatus = status === 'succeeded' ? 'paid' : status === 'refunded' ? 'refunded' : status === 'cancelled' ? 'cancelled' : status === 'failed' ? 'failed' : 'processing'
        const paidAt = status === 'succeeded' ? new Date().toISOString() : status === 'refunded' ? null : transaction.order?.paid_at || null
        await supabase.from('payment_transactions').update({ status: txStatus, raw_response: verification.raw, updated_at: new Date().toISOString() }).eq('id', transaction.id)
        await supabase.from('payment_orders').update({ status: orderStatus, paid_at: paidAt, updated_at: new Date().toISOString() }).eq('id', transaction.order_id)
        if (eventRow?.id) await supabase.from('payment_webhook_events').update({ processed: true, processed_at: new Date().toISOString(), error_message: null }).eq('id', eventRow.id)
        return NextResponse.json({ received: true, status: txStatus }, { status: 200 })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur de traitement webhook'
        if (eventRow?.id) await supabase.from('payment_webhook_events').update({ processed: false, error_message: message }).eq('id', eventRow.id)
        return NextResponse.json({ error: message }, { status: 500 })
      }
    }

    return NextResponse.json({ received: true, ignored: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Webhook error' }, { status: 500 })
  }
}

export async function GET() { return NextResponse.json({ ok: true }) }
