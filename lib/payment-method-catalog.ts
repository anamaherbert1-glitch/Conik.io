export type PaymentMethodDefinition = {
  code: string
  name: string
  kind: 'card' | 'mobile_money' | 'other'
  logoKey: string
  countries?: string[]
  requiresPhone?: boolean
  requiresCard?: boolean
}

export const PAYMENT_METHOD_CATALOG: Record<string, PaymentMethodDefinition[]> = {
  cinetpay: [
    { code: 'visa', name: 'Visa', kind: 'card', logoKey: 'visa', requiresCard: true },
    { code: 'mastercard', name: 'Mastercard', kind: 'card', logoKey: 'mastercard', requiresCard: true },
    { code: 't_money', name: 'T-Money', kind: 'mobile_money', logoKey: 't_money', requiresPhone: true, countries: ['TG'] },
    { code: 'mixx_by_yas', name: 'Mixx by Yas', kind: 'mobile_money', logoKey: 'mixx_by_yas', requiresPhone: true, countries: ['TG'] },
    { code: 'moov_money', name: 'Moov Money', kind: 'mobile_money', logoKey: 'moov_money', requiresPhone: true },
    { code: 'wave', name: 'Wave', kind: 'mobile_money', logoKey: 'wave', requiresPhone: true },
  ],
  flutterwave: [
    { code: 'visa', name: 'Visa', kind: 'card', logoKey: 'visa', requiresCard: true },
    { code: 'mastercard', name: 'Mastercard', kind: 'card', logoKey: 'mastercard', requiresCard: true },
    { code: 'mobile_money', name: 'Mobile Money', kind: 'mobile_money', logoKey: 'mobile_money', requiresPhone: true },
  ],
  paydunya: [
    { code: 'visa', name: 'Visa', kind: 'card', logoKey: 'visa', requiresCard: true },
    { code: 'mastercard', name: 'Mastercard', kind: 'card', logoKey: 'mastercard', requiresCard: true },
    { code: 'wave', name: 'Wave', kind: 'mobile_money', logoKey: 'wave', requiresPhone: true },
    { code: 't_money', name: 'T-Money', kind: 'mobile_money', logoKey: 't_money', requiresPhone: true, countries: ['TG'] },
    { code: 'moov_money', name: 'Moov Money', kind: 'mobile_money', logoKey: 'moov_money', requiresPhone: true },
  ],
  wave: [
    { code: 'wave', name: 'Wave', kind: 'mobile_money', logoKey: 'wave', requiresPhone: true },
  ],
  saspay: [
    { code: 'visa', name: 'Visa', kind: 'card', logoKey: 'visa', requiresCard: true },
    { code: 'mastercard', name: 'Mastercard', kind: 'card', logoKey: 'mastercard', requiresCard: true },
    { code: 'mobile_money', name: 'Mobile Money', kind: 'mobile_money', logoKey: 'mobile_money', requiresPhone: true },
  ],
  ligdicash: [
    { code: 'mobile_money', name: 'Mobile Money', kind: 'mobile_money', logoKey: 'mobile_money', requiresPhone: true },
  ],
  hub2: [
    { code: 'visa', name: 'Visa', kind: 'card', logoKey: 'visa', requiresCard: true },
    { code: 'mastercard', name: 'Mastercard', kind: 'card', logoKey: 'mastercard', requiresCard: true },
    { code: 'mobile_money', name: 'Mobile Money', kind: 'mobile_money', logoKey: 'mobile_money', requiresPhone: true },
  ],
  fedapay: [
    { code: 'visa', name: 'Visa', kind: 'card', logoKey: 'visa', requiresCard: true },
    { code: 'mastercard', name: 'Mastercard', kind: 'card', logoKey: 'mastercard', requiresCard: true },
    { code: 'mobile_money', name: 'Mobile Money', kind: 'mobile_money', logoKey: 'mobile_money', requiresPhone: true },
  ],
  campay: [
    { code: 'mobile_money', name: 'Mobile Money', kind: 'mobile_money', logoKey: 'mobile_money', requiresPhone: true },
  ],
}

export function getPaymentMethodDefinitions(providerId: string) {
  return PAYMENT_METHOD_CATALOG[providerId] || []
}
