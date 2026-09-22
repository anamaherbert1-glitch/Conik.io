const INTERNAL_UNLIMITED_EMAILS = new Set([
  'eliteone003@gmail.com',
  'anamaspenser@gmail.com',
  'joih852@gmail.com',
  'anamaherbert1@gmail.com',
])

export function isInternalUnlimitedEmail(email?: string | null): boolean {
  return !!email && INTERNAL_UNLIMITED_EMAILS.has(email.trim().toLowerCase())
}

export function getInternalUnlimitedAccess(featureKey: string) {
  return {
    allowed: true,
    plan_code: 'internal_unlimited',
    feature_key: featureKey,
    limit_value: null,
    limit_period: null,
    config: { unlimited: true },
    upgrade_required: false,
  }
}
