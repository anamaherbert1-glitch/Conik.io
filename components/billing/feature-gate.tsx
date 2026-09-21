'use client'

import Link from 'next/link'
import { Lock, ArrowUpRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FeatureKey } from '@/lib/billing/features'

type Props = {
  feature: FeatureKey
  children: React.ReactNode
  requiredPlan?: 'Basic' | 'Premium' | 'Business'
  description?: string
}

const codes = { Basic: 'basic', Premium: 'premium', Business: 'business' } as const

export function FeatureGate({ feature, children, requiredPlan = 'Premium', description }: Props) {
  const [state, setState] = useState<{ loading: boolean; allowed: boolean }>({ loading: true, allowed: false })

  useEffect(() => {
    let active = true
    fetch('/api/billing/access?feature=' + encodeURIComponent(feature), { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (active) setState({ loading: false, allowed: r.ok && data.allowed === true })
      })
      .catch(() => {
        if (active) setState({ loading: false, allowed: false })
      })
    return () => { active = false }
  }, [feature])

  if (state.loading) return <div className="panel upgrade-gate"><p className="muted">Vérification de votre abonnement…</p></div>
  if (state.allowed) return <>{children}</>

  const href = '/subscriptions?upgrade=' + codes[requiredPlan] + '&feature=' + encodeURIComponent(feature)
  return (
    <section className="upgrade-gate panel" style={{ marginTop: 18 }}>
      <div className="upgrade-gate-icon"><Lock size={22} /></div>
      <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Fonctionnalité verrouillée</h2>
      <p className="muted" style={{ maxWidth: 520, margin: '0 auto 12px', fontSize: 14, lineHeight: 1.5 }}>
        Cette fonctionnalité n’est pas incluse dans votre formule actuelle.
        Niveau minimum requis : <b>{requiredPlan}</b>.
      </p>
      {description ? <p style={{ maxWidth: 520, margin: '0 auto 16px', fontSize: 13 }}>{description}</p> : null}
      <Link href={href} className="primary" style={{ background: '#f97316', color: '#fff' }}>
        Upgrade vers {requiredPlan} <ArrowUpRight size={16} />
      </Link>
    </section>
  )
}
