export const OFFICIAL_PAYMENT_LOGOS: Record<string, string> = {
  // Official provider-hosted brand assets (not generic third-party logo services).
  cinetpay: 'https://docs.cinetpay.com/images/logo-new.png',
  flutterwave: 'https://flutterwave.com/images/logo/full.svg',
  paydunya: 'https://paydunya.com/assets/img/logo.png',
  wave: 'https://www.wave.com/assets/images/logo.svg',
  saspay: 'https://saspay.me/favicon.ico',
  ligdicash: 'https://www.ligdicash.com/favicon.ico',
  hub2: 'https://www.hub2.io/favicon.ico',
  fedapay: 'https://www.fedapay.com/favicon.ico',
  campay: 'https://www.campay.net/favicon.ico',
}

export const PAYMENT_PROVIDER_BADGE_LABELS: Record<string, string> = {
  cinetpay: 'CinetPay',
  flutterwave: 'Flutterwave',
  paydunya: 'PayDunya',
  wave: 'Wave',
  saspay: 'SasPay',
  ligdicash: 'LigdiCash',
  hub2: 'Hub2',
  fedapay: 'FedaPay',
  campay: 'CamPay',
}

export function getPaymentProviderLogo(provider?: string | null) {
  if (!provider) return undefined
  return OFFICIAL_PAYMENT_LOGOS[provider.toLowerCase()]
}

export function getPaymentProviderBadgeLabel(provider?: string | null) {
  if (!provider) return 'Prestataire'
  return PAYMENT_PROVIDER_BADGE_LABELS[provider.toLowerCase()] || provider
}
