'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ShoppingBag, TrendingUp, Eye, Wallet } from 'lucide-react'

type DayPoint = { date: string; sales: number; revenue_cents: number; visits: number; pending: number }
type OrderRow = {
  id: string
  date: string
  amount_cents: number
  currency: string
  buyer: string
  product: string
  funnel: string
  status: string
  ref: string | null
}
type Payload = {
  from: string
  to: string
  salesCount: number
  revenueCents: number
  currency: string
  visits: number
  visitors: number
  pendingCount: number
  byDay: DayPoint[]
  calendar: Record<string, { sales: number; revenue_cents: number; visits: number }>
  orders: OrderRow[]
  ordersTableMissing?: boolean
}

function fmtMoney(cents: number, currency: string) {
  const amount = currency.toUpperCase() === 'XOF' || currency.toUpperCase() === 'XAF' ? cents : cents / 100
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'XOF',
      maximumFractionDigits: currency.toUpperCase() === 'XOF' || currency.toUpperCase() === 'XAF' ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString('fr-FR')} ${currency}`
  }
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate()
}

export function RevenusDashboard() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const defaultFrom = useMemo(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), [])
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(today)
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`/api/revenus?from=${from}&to=${to}`)
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Erreur de chargement')
      setData(j)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void load()
  }, [load])

  function selectDay(iso: string) {
    setFrom(iso)
    setTo(iso)
  }

  function preset(days: number) {
    const end = new Date()
    const start = new Date(Date.now() - (days - 1) * 86400000)
    setFrom(start.toISOString().slice(0, 10))
    setTo(end.toISOString().slice(0, 10))
  }

  const calCells = useMemo(() => {
    const { y, m } = calMonth
    const first = new Date(y, m, 1)
    const startPad = (first.getDay() + 6) % 7 // lundi = 0
    const total = daysInMonth(y, m)
    const cells: ({ iso: string; day: number } | null)[] = []
    for (let i = 0; i < startPad; i++) cells.push(null)
    for (let d = 1; d <= total; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ iso, day: d })
    }
    return cells
  }, [calMonth])

  const maxSales = Math.max(1, ...(data?.byDay.map((d) => d.sales) || [1]))
  const maxVisits = Math.max(1, ...(data?.byDay.map((d) => d.visits) || [1]))

  return (
    <>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <small>REVENUS</small>
          <h1>Revenus & ventes</h1>
          <p className="muted">
            Ventes via vos liens de paiement Conik, visites et période au calendrier.
          </p>
        </div>
        <div className="button-row" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="outline" onClick={() => preset(7)}>
            7 j
          </button>
          <button type="button" className="outline" onClick={() => preset(30)}>
            30 j
          </button>
          <button type="button" className="outline" onClick={() => preset(90)}>
            90 j
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}
      {data?.ordersTableMissing && (
        <div className="notice" style={{ marginBottom: 12 }}>
          Table <code>payment_orders</code> absente ou inaccessible. Exécutez les migrations paiement +{' '}
          <code>20260916140000_revenus.sql</code> dans Supabase.
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 340px) 1fr',
          gap: 18,
          alignItems: 'start',
        }}
        className="revenus-layout"
      >
        {/* Calendrier accrocheur */}
        <div
          className="panel"
          style={{
            padding: 0,
            overflow: 'hidden',
            background: 'linear-gradient(165deg, #ff6b00 0%, #ff8f3d 42%, #1a1d26 42.1%)',
            border: 'none',
            boxShadow: '0 12px 40px rgba(255, 107, 0, 0.22)',
          }}
        >
          <div style={{ padding: '18px 18px 12px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <CalendarDays size={18} />
              <b style={{ fontSize: 15 }}>Calendrier des revenus</b>
            </div>
            <p style={{ margin: 0, fontSize: 12, opacity: 0.9 }}>Cliquez un jour pour filtrer ventes & visites</p>
          </div>
          <div style={{ background: 'var(--panel, #fff)', borderRadius: '18px 18px 0 0', padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button
                type="button"
                className="outline"
                style={{ padding: '4px 10px' }}
                onClick={() =>
                  setCalMonth((c) => {
                    const d = new Date(c.y, c.m - 1, 1)
                    return { y: d.getFullYear(), m: d.getMonth() }
                  })
                }
              >
                ‹
              </button>
              <b style={{ textTransform: 'capitalize' }}>
                {new Date(calMonth.y, calMonth.m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </b>
              <button
                type="button"
                className="outline"
                style={{ padding: '4px 10px' }}
                onClick={() =>
                  setCalMonth((c) => {
                    const d = new Date(c.y, c.m + 1, 1)
                    return { y: d.getFullYear(), m: d.getMonth() }
                  })
                }
              >
                ›
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 4,
                textAlign: 'center',
                fontSize: 11,
                marginBottom: 6,
                color: 'var(--muted)',
              }}
            >
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {calCells.map((cell, i) => {
                if (!cell) return <div key={`e-${i}`} />
                const act = data?.calendar[cell.iso]
                const selected = from === cell.iso && to === cell.iso
                const intensity = act ? Math.min(1, act.sales / 5 + act.visits / 50) : 0
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => selectDay(cell.iso)}
                    title={
                      act
                        ? `${cell.iso} — ${act.sales} vente(s), ${act.visits} visite(s)`
                        : cell.iso
                    }
                    style={{
                      aspectRatio: '1',
                      borderRadius: 10,
                      border: selected ? '2px solid #ff6b00' : '1px solid transparent',
                      background: act
                        ? `rgba(255, 107, 0, ${0.15 + intensity * 0.55})`
                        : 'transparent',
                      fontWeight: act ? 700 : 500,
                      fontSize: 13,
                      cursor: 'pointer',
                      color: 'inherit',
                    }}
                  >
                    {cell.day}
                  </button>
                )
              })}
            </div>
            <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
              <label className="form-label" style={{ margin: 0 }}>
                Du
                <input className="form-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="form-label" style={{ margin: 0 }}>
                Au
                <input className="form-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {loading && !data ? (
            <div className="panel">Chargement des revenus…</div>
          ) : data ? (
            <>
              <section
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 12,
                }}
              >
                <Metric icon={<ShoppingBag size={18} />} label="Ventes" value={String(data.salesCount)} accent="#ff6b00" />
                <Metric
                  icon={<Wallet size={18} />}
                  label="Chiffre d’affaires"
                  value={fmtMoney(data.revenueCents, data.currency)}
                  accent="#059669"
                />
                <Metric icon={<Eye size={18} />} label="Visites" value={String(data.visits)} accent="#2563eb" />
                <Metric icon={<TrendingUp size={18} />} label="Visiteurs" value={String(data.visitors)} accent="#7c3aed" />
              </section>

              <div className="panel">
                <h3 style={{ marginTop: 0 }}>Ventes & visites sur la période</h3>
                <p className="muted" style={{ marginTop: 0 }}>
                  {from} → {to}
                </p>
                <BarChart byDay={data.byDay} maxSales={maxSales} maxVisits={maxVisits} currency={data.currency} />
              </div>

              <div className="panel">
                <h3 style={{ marginTop: 0 }}>Détail des ventes</h3>
                {data.orders.length === 0 ? (
                  <div className="empty" style={{ height: 'auto', padding: 24 }}>
                    <b>Aucune vente sur cette période</b>
                    <span>Les paiements réussis via vos tarifs / pages de paiement apparaîtront ici.</span>
                  </div>
                ) : (
                  <div className="funnel-table">
                    {data.orders.map((o) => (
                      <div className="funnel-row" key={o.id}>
                        <div>
                          <b>{fmtMoney(o.amount_cents, o.currency)}</b>
                          <span>
                            {new Date(o.date).toLocaleString('fr-FR')} · {o.buyer}
                            {o.product !== '—' ? ` · ${o.product}` : ''}
                            {o.funnel !== '—' ? ` · ${o.funnel}` : ''}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{o.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) {
          .revenus-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  )
}

function Metric({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="card" style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: accent }}>
        {icon}
        <small style={{ color: 'inherit', fontWeight: 600 }}>{label}</small>
      </div>
      <strong style={{ fontSize: 20 }}>{value}</strong>
    </div>
  )
}

function BarChart({ byDay, maxSales, maxVisits, currency }: { byDay: DayPoint[]; maxSales: number; maxVisits: number; currency: string }) {
  const h = 160
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: h, overflowX: 'auto', paddingBottom: 28 }}>
      {byDay.map((d) => {
        const salesH = Math.max(2, (d.sales / maxSales) * (h - 24))
        const visitsH = Math.max(2, (d.visits / maxVisits) * (h - 24) * 0.55)
        return (
          <div
            key={d.date}
            title={`${d.date}\n${d.sales} vente(s) · ${fmtMoney(d.revenue_cents, currency)}\n${d.visits} visite(s)`}
            style={{ flex: '1 0 10px', minWidth: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', justifyContent: 'center' }}>
              <div style={{ width: '42%', height: salesH, borderRadius: '4px 4px 0 0', background: 'linear-gradient(180deg,#ff8f3d,#ff6b00)' }} />
              <div style={{ width: '42%', height: visitsH, borderRadius: '4px 4px 0 0', background: 'rgba(37,99,235,0.55)' }} />
            </div>
            {(byDay.length <= 14 || d.date.endsWith('-01') || d.date === byDay[0]?.date || d.date === byDay[byDay.length - 1]?.date) && (
              <span style={{ position: 'absolute', bottom: -22, fontSize: 9, opacity: 0.65, whiteSpace: 'nowrap' }}>
                {d.date.slice(5)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
