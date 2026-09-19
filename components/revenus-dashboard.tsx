'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ShoppingBag, TrendingUp, Eye, Wallet } from 'lucide-react'

type DayPoint = { date: string; sales: number; revenue_cents: number; visits: number; pending: number }
type OrderRow = {
  id: string; date: string; amount_cents: number; currency: string; buyer: string
  product: string; funnel: string; status: string; ref: string | null
}
type Payload = {
  from: string; to: string; salesCount: number; revenueCents: number; currency: string
  visits: number; visitors: number; pendingCount: number; byDay: DayPoint[]
  calendar: Record<string, { sales: number; revenue_cents: number; visits: number }>
  orders: OrderRow[]; ordersTableMissing?: boolean
}

const PRESETS = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#EA580C', '#E11D48', '#0F172A', '#D97706']

function fmtMoney(cents: number, currency: string) {
  const cur = (currency || 'XOF').toUpperCase()
  const amount = cur === 'XOF' || cur === 'XAF' ? cents : cents / 100
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: cur.length === 3 ? cur : 'XOF',
      maximumFractionDigits: cur === 'XOF' || cur === 'XAF' ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString('fr-FR')} ${cur}`
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
  const [showCalendar, setShowCalendar] = useState(false)
  const [salesColor, setSalesColor] = useState('#EA580C')
  const [visitsColor, setVisitsColor] = useState('#2563EB')
  const [openColor, setOpenColor] = useState<'sales' | 'visits' | null>(null)

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

  useEffect(() => { void load() }, [load])

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

  const maxSales = Math.max(1, ...(data?.byDay.map((d) => d.sales) || [1]))
  const maxVisits = Math.max(1, ...(data?.byDay.map((d) => d.visits) || [1]))

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[7, 30, 90].map((n) => (
            <button key={n} type="button" className="outline" onClick={() => preset(n)}>{n} j</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>
          <input className="form-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ padding: '8px 10px', borderRadius: 10 }} />
          <span className="muted">→</span>
          <input className="form-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: '8px 10px', borderRadius: 10 }} />
          <button type="button" className="outline" onClick={() => setShowCalendar((v) => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={16} /> Calendrier
          </button>
          {showCalendar && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 50, width: 300, background: 'var(--panel,#fff)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 16, boxShadow: '0 16px 48px rgba(15,23,42,0.16)', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <button type="button" className="outline" style={{ padding: '4px 8px' }} onClick={() => setCalMonth((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}>‹</button>
                <strong style={{ fontSize: 13 }}>{new Date(calMonth.y, calMonth.m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</strong>
                <button type="button" className="outline" style={{ padding: '4px 8px' }} onClick={() => setCalMonth((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}>›</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, fontSize: 11, textAlign: 'center', marginBottom: 4 }}>
                {['L','M','M','J','V','S','D'].map((d, i) => <span key={i} className="muted" style={{ fontWeight: 700 }}>{d}</span>)}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                {Array.from({ length: (new Date(calMonth.y, calMonth.m, 1).getDay() + 6) % 7 }).map((_, i) => <div key={`p-${i}`} />)}
                {Array.from({ length: daysInMonth(calMonth.y, calMonth.m) }, (_, i) => {
                  const d = i + 1
                  const iso = `${calMonth.y}-${String(calMonth.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                  const info = data?.calendar?.[iso]
                  const hasSales = (info?.sales || 0) > 0
                  const selected = iso === from && iso === to
                  return (
                    <button key={iso} type="button" onClick={() => { selectDay(iso); setShowCalendar(false) }}
                      style={{ aspectRatio: '1', borderRadius: 10, border: selected ? '2px solid #0f172a' : '1px solid transparent', background: hasSales ? 'linear-gradient(145deg,#ffedd5,#fed7aa)' : 'var(--panel-2,#f8fafc)', cursor: 'pointer', fontSize: 12, fontWeight: hasSales ? 700 : 500, color: hasSales ? '#9a3412' : 'inherit' }}>
                      {d}
                    </button>
                  )
                })}
              </div>
              <p className="muted" style={{ fontSize: 11, margin: '10px 0 0' }}>Jours orange = ventes. Cliquez pour filtrer.</p>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && !data ? (
        <div className="panel">Chargement des revenus…</div>
      ) : data ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            <Metric icon={<ShoppingBag size={18} />} label="Ventes" value={String(data.salesCount)} accent={salesColor} />
            <Metric icon={<Wallet size={18} />} label="Chiffre d’affaires" value={fmtMoney(data.revenueCents, data.currency)} accent="#059669" />
            <Metric icon={<Eye size={18} />} label="Visites" value={String(data.visits)} accent={visitsColor} />
            <Metric icon={<TrendingUp size={18} />} label="Visiteurs" value={String(data.visitors)} accent="#7c3aed" />
          </section>

          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 4 }}>Ventes & visites</h3>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>{from} → {to}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {([
                  { key: 'sales' as const, label: 'Ventes', color: salesColor, set: setSalesColor },
                  { key: 'visits' as const, label: 'Visites', color: visitsColor, set: setVisitsColor },
                ]).map((s) => (
                  <div key={s.key} style={{ position: 'relative' }}>
                    <button type="button" onClick={() => setOpenColor(openColor === s.key ? null : s.key)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, border: `1.5px solid ${s.color}`, background: `${s.color}14`, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      <span style={{ width: 16, height: 16, borderRadius: 6, background: s.color, boxShadow: `0 0 0 2px #fff, 0 0 0 3px ${s.color}44` }} />
                      {s.label}
                    </button>
                    {openColor === s.key && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 20, background: 'var(--panel,#fff)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 12, padding: 10, boxShadow: '0 10px 28px rgba(15,23,42,0.12)', display: 'grid', gridTemplateColumns: 'repeat(4,28px)', gap: 8 }}>
                        {PRESETS.map((c) => (
                          <button key={c} type="button" onClick={() => { s.set(c); setOpenColor(null) }}
                            style={{ width: 28, height: 28, borderRadius: 8, background: c, border: s.color === c ? '2px solid #0f172a' : '2px solid transparent', cursor: 'pointer' }} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <BarChart byDay={data.byDay} maxSales={maxSales} maxVisits={maxVisits} currency={data.currency} salesColor={salesColor} visitsColor={visitsColor} />
          </div>

          <div className="panel">
            <h3 style={{ marginTop: 0 }}>Détail des ventes</h3>
            {data.orders.length === 0 ? (
              <div className="empty" style={{ height: 'auto', padding: 24 }}>
                <b>Aucune vente sur cette période</b>
                <span>Les paiements réussis apparaîtront ici.</span>
              </div>
            ) : (
              <div className="funnel-table">
                {data.orders.map((o) => (
                  <div className="funnel-row" key={o.id}>
                    <div>
                      <b>{o.product || 'Produit'}</b>
                      <div className="muted" style={{ fontSize: 12 }}>{o.buyer || '—'} · {o.funnel || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <b>{fmtMoney(o.amount_cents, o.currency || data.currency)}</b>
                      <div className="muted" style={{ fontSize: 12 }}>{o.date.slice(0, 10)} · {o.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}

function Metric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="card" style={{ display: 'grid', gap: 8, borderTop: `3px solid ${accent}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: accent }}>
        {icon}
        <small style={{ color: 'inherit', fontWeight: 600 }}>{label}</small>
      </div>
      <strong style={{ fontSize: 20 }}>{value}</strong>
    </div>
  )
}

function BarChart({ byDay, maxSales, maxVisits, currency, salesColor, visitsColor }: {
  byDay: DayPoint[]; maxSales: number; maxVisits: number; currency: string; salesColor: string; visitsColor: string
}) {
  const h = 160
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: h, overflowX: 'auto', paddingBottom: 28 }}>
      {byDay.map((d) => {
        const salesH = Math.max(2, (d.sales / maxSales) * (h - 24))
        const visitsH = Math.max(2, (d.visits / maxVisits) * (h - 24) * 0.55)
        return (
          <div key={d.date} title={`${d.date}\n${d.sales} vente(s) · ${fmtMoney(d.revenue_cents, currency)}\n${d.visits} visite(s)`}
            style={{ flex: '1 0 10px', minWidth: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', justifyContent: 'center' }}>
              <div style={{ width: '42%', height: salesH, borderRadius: '4px 4px 0 0', background: salesColor }} />
              <div style={{ width: '42%', height: visitsH, borderRadius: '4px 4px 0 0', background: visitsColor, opacity: 0.8 }} />
            </div>
            {(byDay.length <= 14 || d.date.endsWith('-01') || d.date === byDay[0]?.date || d.date === byDay[byDay.length - 1]?.date) && (
              <span style={{ position: 'absolute', bottom: -22, fontSize: 9, opacity: 0.65, whiteSpace: 'nowrap' }}>{d.date.slice(5)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
