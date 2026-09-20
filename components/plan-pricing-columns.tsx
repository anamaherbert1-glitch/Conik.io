'use client'

import { useState } from 'react'
import { PLANS, PLAN_COMPARISON_ROWS, type PlanCode, formatStorage } from '@/lib/billing/plans'
import { Check, X } from 'lucide-react'

type Prices = Partial<Record<PlanCode, number>>

type Props = {
  prices?: Prices
  currentPlan?: PlanCode | string | null
}

function featureLines(code: PlanCode) {
  const p = PLANS.find((x) => x.code === code)!
  const L = p.limits
  return [
    { ok: true, text: `${L.tunnels} tunnel${L.tunnels > 1 ? 's' : ''}` },
    { ok: true, text: `${L.pagesPerTunnel} pages / tunnel` },
    { ok: true, text: `${L.importsHtmlPerMonth} import${L.importsHtmlPerMonth > 1 ? 's' : ''} HTML / mois` },
    { ok: L.importZip, text: L.importZip ? `Import ZIP (max ${L.importMaxMb} Mo)` : 'Import ZIP' },
    { ok: true, text: `Stockage ${formatStorage(L.storageMb)}` },
    { ok: L.customDomain, text: 'Domaine personnalisé' },
    { ok: L.removeBranding, text: 'Sans branding Conik' },
    {
      ok: L.payments !== 'none',
      text:
        L.payments === 'none'
          ? 'Paiements'
          : L.payments === 'limited'
            ? 'Paiements limités'
            : 'Paiements avancés',
    },
    { ok: L.products > 0, text: L.products > 0 ? `${L.products} produits / offres` : 'Produits / offres' },
    { ok: L.whatsapp, text: 'WhatsApp / Green API' },
    {
      ok: L.automations !== 'none',
      text:
        L.automations === 'none'
          ? 'Automatisations'
          : L.automations === 'limited'
            ? 'Automatisations limitées'
            : 'Automatisations avancées',
    },
    { ok: L.emailsPerMonth > 0, text: L.emailsPerMonth > 0 ? `${L.emailsPerMonth.toLocaleString('fr-FR')} e-mails / mois` : 'E-mail marketing' },
    { ok: true, text: `${L.contacts.toLocaleString('fr-FR')} contacts` },
    { ok: L.live, text: L.live ? `Live (${L.liveCohosts} co-org.)` : 'Live streaming' },
    { ok: L.teamSeats > 1, text: L.teamSeats > 1 ? `${L.teamSeats} membres d’équipe` : 'Équipe multi-utilisateurs' },
    { ok: L.dataExport, text: 'Export des données' },
    { ok: L.advancedReports, text: 'Rapports avancés' },
    {
      ok: true,
      text:
        L.support === 'dedicated'
          ? 'Support dédié'
          : L.support === 'priority'
            ? 'Support prioritaire'
            : 'Support standard',
    },
    {
      ok: true,
      text:
        L.analytics === 'advanced'
          ? 'Analytics avancés'
          : L.analytics === 'standard'
            ? 'Analytics standard'
            : 'Analytics basiques',
    },
  ]
}

export function PlanPricingColumns({ prices, currentPlan = 'free' }: Props) {
  const [selected, setSelected] = useState<PlanCode>(
    (['free', 'basic', 'premium', 'business'].includes(String(currentPlan))
      ? currentPlan
      : 'basic') as PlanCode,
  )
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  function priceOf(code: PlanCode) {
    if (prices && prices[code] != null) return Number(prices[code])
    return PLANS.find((p) => p.code === code)?.priceMonthlyXof ?? 0
  }

  async function choose(plan: PlanCode) {
    if (plan === currentPlan) return
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/billing/select-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(j.error || 'Erreur')
        return
      }
      setMsg(j.message || (plan === 'free' ? 'Plan Free actif.' : 'Demande enregistrée.'))
      if (plan === 'free') window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pricing-page">
      <header className="pricing-hero">
        <small>ABONNEMENTS CONIK</small>
        <h1>Choisissez la formule adaptée</h1>
        <p className="muted">
          Free pour découvrir · Basic pour vendre · Premium pour scaler · Business pour les équipes.
          Chaque colonne liste clairement ce qui est inclus.
        </p>
      </header>

      <div className="pricing-columns">
        {PLANS.map((plan) => {
          const price = priceOf(plan.code)
          const isCurrent = currentPlan === plan.code
          const isSelected = selected === plan.code
          const lines = featureLines(plan.code)
          return (
            <article
              key={plan.code}
              className={`pricing-col ${plan.highlighted ? 'featured' : ''} ${isSelected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
              onClick={() => setSelected(plan.code)}
            >
              {plan.highlighted && <div className="pricing-ribbon">Recommandé</div>}
              {isCurrent && <div className="pricing-current-tag">Formule actuelle</div>}
              <div className="pricing-col-head">
                <h2>{plan.name}</h2>
                <p>{plan.tagline}</p>
                <div className="pricing-col-price">
                  {price <= 0 ? (
                    <strong>Gratuit</strong>
                  ) : (
                    <>
                      <strong>{price.toLocaleString('fr-FR')}</strong>
                      <span> XOF / mois</span>
                    </>
                  )}
                </div>
              </div>
              <ul className="pricing-features">
                {lines.map((line) => (
                  <li key={line.text} className={line.ok ? 'yes' : 'no'}>
                    <span className="ico">{line.ok ? <Check size={14} /> : <X size={14} />}</span>
                    <span>{line.text}</span>
                  </li>
                ))}
              </ul>
              <div className="pricing-col-cta">
                {isCurrent ? (
                  <button type="button" className="outline" disabled>
                    Actuel
                  </button>
                ) : plan.code === 'free' ? (
                  <button type="button" className="outline" disabled={busy} onClick={() => void choose('free')}>
                    Rester en Free
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary"
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation()
                      void choose(plan.code)
                    }}
                  >
                    {busy && selected === plan.code ? '…' : `Choisir ${plan.name}`}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {msg && <div className="notice" style={{ marginTop: 16 }}>{msg}</div>}

      <div className="panel plans-table-wrap" style={{ marginTop: 28 }}>
        <h3 style={{ marginTop: 0 }}>Comparatif rapide</h3>
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
    </div>
  )
}
