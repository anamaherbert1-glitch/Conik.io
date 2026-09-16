export const PAYMENT_METHOD_LOGOS: Record<string, string> = {
  visa: 'https://corporate.visa.com/content/dam/VCOM/corporate/about-visa/documents/visa-brand-standards-sept2025.pdf',
  mastercard: 'https://www.mastercard.com/global/en/vision/corp-media-library.html',
  cinetpay_card: 'https://docs.cinetpay.com/images/logo-new.png',
  t_money: 'https://www.togocel.tg/favicon.ico',
  tmoney: 'https://www.togocel.tg/favicon.ico',
  mixx: 'https://yas.tg/favicon.ico',
  mixx_by_yas: 'https://yas.tg/favicon.ico',
  moov_money: 'https://moov-africa.tg/favicon.ico',
  flooz: 'https://moov-africa.tg/favicon.ico',
  mobile_money: 'https://docs.cinetpay.com/images/logo-new.png',
  flutterwave: 'https://flutterwave.com/favicon.ico',
  wave: 'https://www.wave.com/favicon.ico',
}

export function getPaymentMethodLogo(methodCode?: string | null, config?: Record<string, unknown> | null) {
  const configured = typeof config?.logo_url === 'string' ? config.logo_url.trim() : ''
  if (configured) return configured
  if (!methodCode) return undefined
  return PAYMENT_METHOD_LOGOS[methodCode.toLowerCase()]
}

export function getPaymentMethodKind(methodCode?: string | null, displayName?: string | null) {
  const value = `${methodCode || ''} ${displayName || ''}`.toLowerCase()
  if (/(visa|mastercard|card|carte)/.test(value)) return 'card'
  if (/(t[-_ ]?money|tmoney|mixx|yas|moov|flooz|wave|mobile|money)/.test(value)) return 'mobile_money'
  return 'other'
}
