import crypto from 'node:crypto'

type Provider = {
  id: string
  provider: string
  credentials: Record<string, unknown> | null
  public_config?: Record<string, unknown> | null
}

type PaymentInput = {
  provider: Provider
  methodCode: string
  orderId: string
  orderNumber: string
  amountCents: number
  currency: string
  productLabel: string
  customer: { name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null }
  baseUrl: string
}

type PaymentResult = {
  providerTransactionId: string
  paymentUrl?: string
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  rawResponse: unknown
}

function credentials(provider: Provider) { return (provider.credentials || {}) as Record<string, string> }
function base(baseUrl: string) { return baseUrl.replace(/\/$/, '') }
async function readJson(response: Response) {
  const text = await response.text()
  try { return text ? JSON.parse(text) : {} } catch { return { raw: text } }
}

export async function initializeProviderPayment(input: PaymentInput): Promise<PaymentResult> {
  const { provider, methodCode, orderNumber, amountCents, currency, productLabel, customer, baseUrl } = input
  const creds = credentials(provider)
  const callbackUrl = `${base(baseUrl)}/api/payments/webhooks/${provider.provider}`
  const returnUrl = `${base(baseUrl)}/payment/result?order=${encodeURIComponent(orderNumber)}`
  const amount = Math.round(amountCents / 100)

  switch (provider.provider) {
    case 'cinetpay': {
      if (!creds.apikey || !creds.site_id) throw new Error('CinetPay: API Key et Site ID requis.')
      const normalizedMethod = methodCode.toLowerCase()
      const isCard = ['visa', 'mastercard', 'cinetpay_card', 'card', 'credit_card'].includes(normalizedMethod) || normalizedMethod.includes('card')
      const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apikey: creds.apikey, site_id: creds.site_id, transaction_id: orderNumber, amount, currency,
          description: productLabel.replace(/[#$,_&/]/g, ' ').slice(0, 255), notify_url: callbackUrl, return_url: returnUrl,
          channels: isCard ? 'CREDIT_CARD' : 'MOBILE_MONEY', lang: 'FR', metadata: orderNumber,
          customer_id: input.orderId, customer_name: customer?.lastName || customer?.name || 'Client', customer_surname: customer?.firstName || '',
          customer_email: customer?.email || '', customer_phone_number: customer?.phone || '',
        }),
      })
      const data = await readJson(response)
      if (!response.ok || data?.code !== '201' || !data?.data?.payment_url) throw new Error(`CinetPay: ${data?.message || data?.description || 'initialisation échouée'}`)
      return { providerTransactionId: orderNumber, paymentUrl: data.data.payment_url, status: 'processing', rawResponse: data }
    }

    case 'flutterwave': {
      if (!creds.secret_key) throw new Error('Flutterwave: Secret Key requise.')
      const normalizedMethod = methodCode.toLowerCase()
      const paymentOptions = ['visa', 'mastercard', 'card', 'credit_card'].includes(normalizedMethod) || normalizedMethod.includes('card') ? 'card' : undefined
      const response = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST', headers: { Authorization: `Bearer ${creds.secret_key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_ref: orderNumber, amount, currency, redirect_url: returnUrl, payment_options: paymentOptions,
          customer: { email: customer?.email || 'customer@conik.io', phonenumber: customer?.phone || '', name: customer?.name || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Client' },
          customizations: { title: 'Conik', description: productLabel }, meta: { order_id: input.orderId, method_code: methodCode },
        }),
      })
      const data = await readJson(response)
      if (!response.ok || data?.status !== 'success' || !data?.data?.link) throw new Error(`Flutterwave: ${data?.message || 'initialisation échouée'}`)
      return { providerTransactionId: String(data.data.id || orderNumber), paymentUrl: data.data.link, status: 'processing', rawResponse: data }
    }

    case 'paydunya': {
      if (!creds.master_key || !creds.private_key || !creds.token) throw new Error('PayDunya: Master Key, Private Key et Token requis.')
      const sandbox = String(provider.public_config?.environment || '').toLowerCase() === 'sandbox' || String(creds.private_key).startsWith('test_')
      const endpoint = sandbox ? 'https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create' : 'https://app.paydunya.com/api/v1/checkout-invoice/create'
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'PAYDUNYA-MASTER-KEY': creds.master_key, 'PAYDUNYA-PRIVATE-KEY': creds.private_key, 'PAYDUNYA-TOKEN': creds.token },
        body: JSON.stringify({ invoice: { total_amount: amount, description: productLabel, customer: { name: customer?.name || `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim(), email: customer?.email || '', phone: customer?.phone || '' } }, store: { name: 'Conik' }, actions: { callback_url: callbackUrl, return_url: returnUrl }, custom_data: { order_id: input.orderId, order_number: orderNumber, method_code: methodCode } }),
      })
      const data = await readJson(response)
      if (!response.ok || data?.response_code !== '00' || !data?.response_text) throw new Error(`PayDunya: ${data?.response_text || data?.description || 'initialisation échouée'}`)
      return { providerTransactionId: String(data.token), paymentUrl: data.response_text, status: 'processing', rawResponse: data }
    }

    case 'fedapay': {
      if (!creds.secret_key) throw new Error('FedaPay: Clé secrète requise.')
      const environment = String(provider.public_config?.environment || 'live').toLowerCase()
      const apiBase = environment === 'sandbox' ? 'https://sandbox-api.fedapay.com/v1' : 'https://api.fedapay.com/v1'
      const createResponse = await fetch(`${apiBase}/transactions`, {
        method: 'POST', headers: { Authorization: `Bearer ${creds.secret_key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: productLabel, amount, currency: { iso: currency }, callback_url: returnUrl, merchant_reference: orderNumber, custom_metadata: { order_id: input.orderId, method_code: methodCode }, customer: { email: customer?.email || undefined, firstname: customer?.firstName || undefined, lastname: customer?.lastName || undefined } }),
      })
      const created = await readJson(createResponse)
      const transactionId = created?.id || created?.transaction?.id
      if (!createResponse.ok || !transactionId) throw new Error(`FedaPay: ${created?.message || 'création échouée'}`)
      const tokenResponse = await fetch(`${apiBase}/transactions/${transactionId}/token`, { method: 'POST', headers: { Authorization: `Bearer ${creds.secret_key}`, 'Content-Type': 'application/json' } })
      const tokenData = await readJson(tokenResponse)
      const paymentUrl = tokenData?.url || tokenData?.token?.url || tokenData?.payment_url
      if (!tokenResponse.ok || !paymentUrl) throw new Error('FedaPay: impossible de générer le lien de paiement.')
      return { providerTransactionId: String(transactionId), paymentUrl, status: 'processing', rawResponse: { created, token: tokenData } }
    }

    default:
      throw new Error(`Le prestataire ${provider.provider} n'a pas encore d'adaptateur de paiement serveur actif.`)
  }
}

export function mapProviderStatus(payload: any): 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled' | null {
  const raw = String(payload?.status ?? payload?.data?.status ?? payload?.event ?? payload?.type ?? payload?.name ?? '').toLowerCase()
  if (['refunded', 'refund', 'transaction.refunded', 'charge.refunded'].some(v => raw.includes(v))) return 'refunded'
  if (['approved', 'successful', 'success', 'completed', 'accepted', 'paid', 'transaction.approved', 'charge.completed'].some(v => raw.includes(v))) return 'succeeded'
  if (['failed', 'failure', 'declined', 'refused', 'cancelled', 'canceled', 'transaction.declined', 'transaction.canceled'].some(v => raw.includes(v))) return raw.includes('cancel') ? 'cancelled' : 'failed'
  if (['pending', 'processing', 'waiting', 'created'].some(v => raw.includes(v))) return 'pending'
  return null
}

export function extractProviderReference(provider: string, payload: any): string | null {
  if (provider === 'cinetpay') return payload?.cpm_trans_id || null
  if (provider === 'flutterwave') return payload?.data?.tx_ref || payload?.data?.id?.toString() || null
  if (provider === 'paydunya') return payload?.token || payload?.data?.token || null
  if (provider === 'fedapay') return payload?.data?.object?.id?.toString() || payload?.data?.id?.toString() || payload?.id?.toString() || payload?.data?.object?.merchant_reference || null
  return payload?.reference || payload?.transaction_id || payload?.id?.toString() || null
}

export function verifySimpleSignature(secret: string | undefined, signature: string | null, payload: string) {
  if (!secret) return true
  if (!signature) return false
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const a = Buffer.from(expected); const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
