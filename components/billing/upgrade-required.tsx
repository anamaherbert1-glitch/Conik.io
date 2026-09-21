'use client'

import Link from 'next/link'
import { Lock, Gift, ArrowUpRight } from 'lucide-react'
import { usePreferences } from '@/components/preferences-provider'

type Props = {
  feature: string
  requiredPlan?: 'Basic' | 'Premium' | 'Business'
  description?: string
}

const planCode: Record<NonNullable<Props['requiredPlan']>, string> = {
  Basic: 'basic',
  Premium: 'premium',
  Business: 'business',
}

export function UpgradeRequired({ feature, requiredPlan = 'Premium', description }: Props) {
  const { dict } = usePreferences()\n  const t = dict.common\n  const target = planCode[requiredPlan]
  const href = `/subscriptions?upgrade=${target}&feature=${encodeURIComponent(feature)}`

  return (
    <section className="upgrade-gate panel" style={{ marginTop: 18 }}>
      <div className="upgrade-gate-icon">
        <Lock size={22} />
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>{t.featureUnavailable}</h2>
      <p className="muted" style={{ maxWidth: 520, margin: '0 auto 12px', fontSize: 14, lineHeight: 1.5 }}>
        <b>{feature}</b> {t.notAvailableInPlan}
        {t.minimumPlan} : <b>{requiredPlan}</b>.
      </p>
      {description ? (
        <p style={{ maxWidth: 520, margin: '0 auto 16px', fontSize: 13, lineHeight: 1.45 }}>{description}</p>
      ) : null}
      <p className="muted" style={{ fontSize: 12, margin: '0 0 16px' }}>
        {t.freeTrial}.
      </p>
      <Link
        href={href}
        className="primary"
        style={{ background: '#f97316', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
      >
        <Gift size={16} />
        {t.upgradeTo}
        <ArrowUpRight size={16} />
      </Link>
    </section>
  )
}
