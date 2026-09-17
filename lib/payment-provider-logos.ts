export const OFFICIAL_PAYMENT_LOGOS: Record<string, string> = {
  // Local assets bundled with Conik. No remote logo request is required at runtime.
  cinetpay: '/payment-providers/cinetpay.svg',
  flutterwave: '/payment-providers/flutterwave.svg',
  paydunya: '/payment-providers/paydunya.svg',
  wave: '/payment-providers/wave.svg',
  saspay: '/payment-providers/saspay.svg',
  ligdicash: '/payment-providers/ligdicash.svg',
  hub2: '/payment-providers/hub2.svg',
  fedapay: '/payment-providers/fedapay.svg',
  campay: '/payment-providers/campay.svg',
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
