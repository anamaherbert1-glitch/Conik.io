export const PAYMENT_METHOD_LOGOS: Record<string, string> = {
  visa: 'https://corporate.visa.com/favicon.ico',
  mastercard: 'https://www.mastercard.com/favicon.ico',
  cinetpay_card: 'https://docs.cinetpay.com/images/logo-new.png',
  t_money: 'https://www.togocel.tg/favicon.ico',
  tmoney: 'https://www.togocel.tg/favicon.ico',
  mixx: 'https://yas.tg/favicon.ico',
  mixx_by_yas: 'https://yas.tg/favicon.ico',
  moov_money: 'https://moov-africa.tg/favicon.ico',
  flooz: 'https://moov-africa.tg/favicon.ico',
  wave: 'https://www.wave.com/favicon.ico',
  orange_money: 'https://www.orange.com/favicon.ico',
  orange_money_ci: 'https://www.orange.com/favicon.ico',
  mtn_momo: 'https://www.mtn.com/favicon.ico',
  mtn_mobile_money: 'https://www.mtn.com/favicon.ico',
  airtel_money: 'https://www.airtel.com/favicon.ico',
  mpesa: 'https://www.vodafone.com/favicon.ico',
  apple_pay: 'https://www.apple.com/favicon.ico',
  google_pay: 'https://pay.google.com/favicon.ico',
  paypal: 'https://www.paypal.com/favicon.ico',
  amex: 'https://www.americanexpress.com/favicon.ico',
  unionpay: 'https://www.unionpayintl.com/favicon.ico',
  discover: 'https://www.discover.com/favicon.ico',
  mobile_money: 'https://docs.cinetpay.com/images/logo-new.png',
  flutterwave: 'https://flutterwave.com/favicon.ico',
  paydunya: 'https://paydunya.com/favicon.ico',
  cinetpay: 'https://docs.cinetpay.com/images/logo-new.png',
  saspay: 'https://saspay.me/favicon.ico',
  ligdicash: 'https://www.ligdicash.com/favicon.ico',
  hub2: 'https://www.hub2.io/favicon.ico',
  fedapay: 'https://www.fedapay.com/favicon.ico',
  campay: 'https://www.campay.net/favicon.ico',
}

export const PAYMENT_PROVIDER_LOGOS: Record<string, string> = {
  cinetpay: 'https://docs.cinetpay.com/images/logo-new.png',
  flutterwave: 'https://flutterwave.com/favicon.ico',
  paydunya: 'https://paydunya.com/favicon.ico',
  wave: 'https://www.wave.com/favicon.ico',
  saspay: 'https://saspay.me/favicon.ico',
  ligdicash: 'https://www.ligdicash.com/favicon.ico',
  hub2: 'https://www.hub2.io/favicon.ico',
  fedapay: 'https://www.fedapay.com/favicon.ico',
  campay: 'https://www.campay.net/favicon.ico',
}

export function getPaymentMethodLogo(methodCode?: string | null, config?: Record<string, unknown> | null, provider?: string | null) {
  const configured = typeof config?.logo_url === 'string' ? config.logo_url.trim() : ''
  if (configured) return configured
  if (methodCode) {
    const logo = PAYMENT_METHOD_LOGOS[methodCode.toLowerCase()]
    if (logo) return logo
  }
  if (provider) return PAYMENT_PROVIDER_LOGOS[provider.toLowerCase()]
  return undefined
}

export function getPaymentMethodKind(methodCode?: string | null, displayName?: string | null) {
  const value = `${methodCode || ''} ${displayName || ''}`.toLowerCase()
  if (/(visa|mastercard|card|carte|amex|american express|unionpay|discover|apple pay|google pay|paypal)/.test(value)) return 'card'
  if (/(t[-_ ]?money|tmoney|mixx|yas|moov|flooz|wave|orange|mtn|momo|airtel|mpesa|mobile|money)/.test(value)) return 'mobile_money'
  return 'other'
}
