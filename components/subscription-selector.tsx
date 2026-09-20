'use client'

import { useMemo, useState } from 'react'
import {
  PLANS,
  PLAN_COMPARISON_ROWS,
  type PlanCode,
  formatStorage,
} from '@/lib/billing/plans'

type Prices = Partial<Record<PlanCode, number>>

type Props = {
  prices?: Prices
  currentPlan?: PlanCode | string | null
  whatsappDailyBasic?: number
  whatsappDailyPremium?: number
  whatsappEndsAt?: string | null
  compact?: boolean
}

export function SubscriptionSelector({
  prices,
  currentPlan = 'free',
  whatsappDailyBasic = 0,
  whatsappDailyPremium = 0,
  whatsappEndsAt,
  compact = false,
}: Props) {
  const [selected, setSelected] = useState<PlanCode>(
    (['free', 'basic', 'premium', 'business'].includes(String(currentPlan))
      ? currentPlan
      : 'basic') as PlanCode,
  )
  const [days, setDays] = useState(7)
  const [showTable, setShowTable] = useState(false)
  const [busy, setBusy] = useState(false)

  const daily = selected === 'premium' || selected === 'business' ? whatsappDailyPremium : whatsappDailyBasic
  const whatsappTotal = useMemo(() => daily * days, [daily, days])
  const selectedPlan = PLANS.find((p) => p.code === selected)!

  function priceOf(code: PlanCode) {
    if (prices && prices[code] != null) return Number(prices[code])
    return PLANS.find((p) => p.code === code)?.priceMonthlyXof ?? 0
  }

  async function choosePlan() {
    if (selected === 'free' || selected === currentPlan) return
    setBusy(true)
    try {
      const res = await fetch('/api/billing/select-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selected, whatsappDays: days }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(j.error || 'Impossible de changer d’offre pour le moment.')
        return
      }
      if (j.checkoutUrl) {
        window.location.href = j.checkoutUrl
        return
      }
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`plans-wrap ${compact ? 'plans-compact' : ''}`}>
      {!compact && (
        <div className="plans-intro">
          <small>OFFRES CONIK</small>
          <h2>Choisissez votre formule</h2>
          <p className="muted">
            Free pour tester · Basic pour vendre · Premium pour scaler · Business pour les équipes.
          </p>
        </div>
      )}

      <div className="plans-bands">
        {PLANS.map((plan) => {
          const price = priceOf(plan.code)
          const active = selected === plan.code
          const isCurrent = currentPlan === plan.code
          return (
            <button
              key={plan.code}
              type="button"
              className={`plan-band ${active ? 'active' : ''} ${plan.highlighted ? 'featured' : ''} ${isCurrent ? 'current' : ''}`}
              onClick={() => setSelected(plan.code)}
            >
              <div className="plan-band-left">
                <div className="plan-band-title">
                  <strong>{plan.name}</strong>
                  {plan.highlighted && <span className="plan-pill">Recommandé</span>}
                  {isCurrent && <span className="plan-pill muted-pill">Actuel</span>}
                </div>
                <div className="plan-band-tag">{plan.tagline}</div>
                <div className="plan-band-meta">
                  {plan.limits.tunnels} tunnels · {plan.limits.contacts.toLocaleString('fr-FR')} contacts ·{' '}
                  {formatStorage(plan.limits.storageMb)}
                  {plan.limits.whatsapp ? ' · WhatsApp' : ''}
                  {plan.limits.live ? ' · Live' : ''}
                  {plan.limits.customDomain ? ' · Domaine' : ''}
                </div>
              </div>
              <div className="plan-band-right">
                {price <= 0 ? (
                  <div className="plan-band-price">
                    <strong>Gratuit</strong>
                  </div>
                ) : (
                  <div className="plan-band-price">
                    <strong>{price.toLocaleString('fr-FR')}</strong>
                    <span>XOF / mois</span>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="plan-detail panel">
        <div className="plan-detail-head">
          <div>
            <b>{selectedPlan.name}</b>
            <span className="muted"> — {selectedPlan.tagline}</span>
          </div>
          <div className="plan-detail-price">
            {priceOf(selected) <= 0
              ? 'Gratuit'
              : `${priceOf(selected).toLocaleString('fr-FR')} XOF / 30 jours`}
          </div>
        </div>

        {(selected === 'premium' || selected === 'business') && (
          <div className="wa-option">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <b>Option WhatsApp GREEN-API</b>
              <strong>
                {days} jour{days > 1 ? 's' : ''}
              </strong>
            </div>
            <input
              aria-label="Durée WhatsApp"
              type="range"
              min={1}
              max={31}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
            <div className="muted" style={{ fontSize: 12 }}>
              {daily.toLocaleString('fr-FR')} XOF/jour · Total option : {whatsappTotal.toLocaleString('fr-FR')} XOF
            </div>
            {whatsappEndsAt && (
              <div className="notice">
                WhatsApp actif jusqu’au {new Date(whatsappEndsAt).toLocaleDateString('fr-FR')}.
              </div>
            )}
          </div>
        )}

        <div className="plan-cta">
          {selected === currentPlan || selected === 'free' ? (
            <button type="button" className="outline" disabled>
              {selected === currentPlan ? 'Formule actuelle' : selected === 'free' ? 'Inclus gratuitement' : 'Sélectionné'}
            </button>
          ) : (
            <button type="button" className="primary" disabled={busy} onClick={() => void choosePlan()}>
              {busy ? 'Préparation…' : `Passer à ${selectedPlan.name}`}
            </button>
          )}
          <span className="muted" style={{ fontSize: 12 }}>
            Le paiement débloque automatiquement les fonctionnalités du plan.
          </span>
        </div>
      </div>

      <button type="button" className="outline" onClick={() => setShowTable((v) => !v)}>
        {showTable ? 'Masquer le comparatif' : 'Voir le comparatif détaillé'}
      </button>

      {showTable && (
        <div className="panel plans-table-wrap">
          <table className="plans-table">
            <thead>
              <tr>
                <th>Fonctionnalité</th>
                {PLANS.map((p) => (
                  <th key={p.code}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON_ROWS.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  {PLANS.map((p) => (
                    <td key={p.code}>{row.value(p)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
