'use client'

import { useEffect, useState } from 'react'
import { SubscriptionSelector } from '@/components/subscription-selector'
import type { PlanCode } from '@/lib/billing/plans'
import { CreditCard } from 'lucide-react'

export function SettingsBilling() {
  const [ready, setReady] = useState(false)
  const [prices, setPrices] = useState<Partial<Record<PlanCode, number>>>({})
  const [currentPlan, setCurrentPlan] = useState<PlanCode>('free')
  const [whatsappEndsAt, setWhatsappEndsAt] = useState<string | null>(null)
  const [waBasic, setWaBasic] = useState(0)
  const [waPremium, setWaPremium] = useState(0)

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/billing/status')
        if (r.ok) {
          const j = await r.json()
          setPrices(j.prices || {})
          setCurrentPlan(j.currentPlan || 'free')
          setWhatsappEndsAt(j.whatsappEndsAt || null)
          setWaBasic(Number(j.whatsappDailyBasic || 0))
          setWaPremium(Number(j.whatsappDailyPremium || 0))
        }
      } finally {
        setReady(true)
      }
    })()
  }, [])

  return (
    <section className="panel settings-section" id="billing">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <CreditCard size={18} />
        <h3 style={{ margin: 0 }}>Abonnement</h3>
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Choisissez Free, Basic, Premium ou Business. Les fonctionnalités se débloquent selon le plan actif.
      </p>
      {!ready ? (
        <div className="muted">Chargement des offres…</div>
      ) : (
        <SubscriptionSelector
          compact
          prices={prices}
          currentPlan={currentPlan}
          whatsappDailyBasic={waBasic}
          whatsappDailyPremium={waPremium}
          whatsappEndsAt={whatsappEndsAt}
        />
      )}
    </section>
  )
}
