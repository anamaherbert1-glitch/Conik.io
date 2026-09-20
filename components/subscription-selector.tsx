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
}

export function SubscriptionSelector({
  prices,
  currentPlan = 'free',
  whatsappDailyBasic = 0,
  whatsappDailyPremium = 0,
  whatsappEndsAt,
}: Props) {
  const [selected, setSelected] = useState<PlanCode>(
    (['free', 'basic', 'premium', 'business'].includes(String(currentPlan))
      ? currentPlan
      : 'basic') as PlanCode,
  )
  const [days, setDays] = useState(7)
  const [showTable, setShowTable] = useState(false)

  const daily = selected === 'premium' || selected === 'business' ? whatsappDailyPremium : whatsappDailyBasic
  const whatsappTotal = useMemo(() => daily * days, [daily, days])
  const selectedPlan = PLANS.find((p) => p.code === selected)!

  function priceOf(code: PlanCode) {
    if (prices && prices[code] != null) return Number(prices[code])
    return PLANS.find((p) => p.code === code)?.priceMonthlyXof ?? 0
  }

  return (
    <div className="plans-wrap">
      <div className="plans-intro">
        <small>OFFRES CONIK</small>
        <h2>Choisissez votre formule</h2>
        <p className="muted">
          Free pour découvrir · Basic pour vendre simplement · Premium pour scaler · Business pour les équipes.
          Les limites sont nettes : pas d’« illimité » trompeur.
        </p>
      </div>

      <div className="plans-grid">
        {PLANS.map((plan) => {
          const price = priceOf(plan.code)
          const active = selected === plan.code
          const isCurrent = currentPlan === plan.code
          return (
            <button
              key={plan.code}
              type="button"
              className={`plan-card ${active ? 'active' : ''} ${plan.highlighted ? 'featured' : ''}`}
              onClick={() => setSelected(plan.code)}
            >
              {plan.highlighted && <span className="plan-ribbon">Recommandé</span>}
              {isCurrent && <span className="plan-current">Actuel</span>}
              <div className="plan-name">{plan.name}</div>
              <div className="plan-tag">{plan.tagline}</div>
              <div className="plan-price">
                {price <= 0 ? (
                  <strong>Gratuit</strong>
                ) : (
                  <>
                    <strong>{price.toLocaleString('fr-FR')}</strong>
                    <span> XOF / mois</span>
                  </>
                )}
              </div>
              <ul className="plan-bullets">
                <li>{plan.limits.tunnels} tunnel{plan.limits.tunnels > 1 ? 's' : ''}</li>
                <li>{plan.limits.pagesPerTunnel} pages / tunnel</li>
                <li>{plan.limits.contacts.toLocaleString('fr-FR')} contacts</li>
                <li>{formatStorage(plan.limits.storageMb)} stockage</li>
                {plan.limits.whatsapp && <li>WhatsApp inclus</li>}
                {plan.limits.live && <li>Live + co-hosts</li>}
                {plan.limits.customDomain && <li>Domaine personnalisé</li>}
                {plan.limits.payments === 'none' && <li className="dim">Sans paiements</li>}
                {plan.limits.payments !== 'none' && (
                  <li>Paiements {plan.limits.payments === 'limited' ? 'limités' : 'avancés'}</li>
                )}
              </ul>
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
          {selected === 'free' || currentPlan === selected ? (
            <button type="button" className="outline" disabled>
              {currentPlan === selected ? 'Formule actuelle' : 'Inclus gratuitement'}
            </button>
          ) : (
            <button type="button" className="primary">
              Passer à {selectedPlan.name}
            </button>
          )}
          <span className="muted" style={{ fontSize: 12 }}>
            L’activation payante se fait après confirmation du paiement côté serveur.
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
