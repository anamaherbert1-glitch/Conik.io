'use client'

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  CalendarDays, ChevronDown, ChevronUp, Eye, MousePointer2, ShoppingBag,
  TrendingUp, Users, Wallet, FileInput, Target,
} from 'lucide-react'
import { LineChart, BarChart } from '@/components/performance/charts'

type AnalyticsDay = { date: string; views: number; clicks: number; submissions: number; conversions: number }
type AnalyticsPayload = {
  pageViews: number
  visitors: number
  clicks: number
  submissions: number
  leads: number
  conversions: number
  revenue: number | null
  revenueByCurrency: Record<string, number>
  byDay: AnalyticsDay[]
}

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
type RevenusPayload = {
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

const DEFAULT_COLORS: Record<string, string> = {
  views: '#2563EB',
  clicks: '#7C3AED',
  submissions: '#0891B2',
  conversions: '#059669',
  sales: '#EA580C',
  revenue: '#D97706',
  visits: '#64748B',
}

function fmtMoney(cents: number, currency: string) {
  const cur = (currency || 'XOF').toUpperCase()
  const amount = cur === 'XOF' || cur === 'XAF' ? cents : cents / 100
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: cur.length === 3 ? cur : 'XOF',
      maximumFractionDigits: cur === 'XOF' || cur === 'XAF' ? 0 : 2,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString('fr-FR')} ${cur}`
  }
}

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate()
}

export function PerformanceDashboard() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const defaultFrom = useMemo(() => new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), [])
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(today)
  const [daysQuick, setDaysQuick] = useState(30)

  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null)
  const [revenus, setRevenus] = useState<RevenusPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCalendar, setShowCalendar] = useState(true)
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }
  })

  const [colors, setColors] = useState(() => ({ ...DEFAULT_COLORS }))
  const [visible, setVisible] = useState<Record<string, boolean>>({
    views: true,
    clicks: true,
    submissions: true,
    conversions: true,
    sales: true,
    visits: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const spanDays = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1)
      const [aRes, rRes] = await Promise.all([
        fetch(`/api/analytics?days=${spanDays}`),
        fetch(`/api/revenus?from=${from}&to=${to}`),
      ])
      const aJson = await aRes.json()
      const rJson = await rRes.json()
      if (!aRes.ok && !rRes.ok) throw new Error(aJson.error || rJson.error || 'Impossible de charger les données')
      if (aRes.ok) setAnalytics(aJson)
      if (rRes.ok) setRevenus(rJson)
      if (!aRes.ok) setError(aJson.error || 'Analytics partiellement indisponible')
      if (!rRes.ok) setError((prev) => (prev ? prev + ' · ' : '') + (rJson.error || 'Revenus partiellement indisponible'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void load()
  }, [load])

  function preset(n: number) {
    setDaysQuick(n)
    const end = new Date()
    const start = new Date(Date.now() - (n - 1) * 86400000)
    setTo(end.toISOString().slice(0, 10))
    setFrom(start.toISOString().slice(0, 10))
  }

  function selectDay(iso: string) {
    setFrom(iso)
    setTo(iso)
    setDaysQuick(1)
  }

  const currency = revenus?.currency || 'XOF'
  const conversionRate = analytics && analytics.pageViews ? (analytics.conversions / analytics.pageViews) * 100 : 0

  const trafficSeries = useMemo(() => {
    const byDay = analytics?.byDay || []
    return byDay.map((d) => ({
      date: d.date,
      views: d.views,
      clicks: d.clicks,
      submissions: d.submissions,
      conversions: d.conversions,
    }))
  }, [analytics])

  const salesSeries = useMemo(() => revenus?.byDay || [], [revenus])

  const calCells = useMemo(() => {
    const first = new Date(calMonth.y, calMonth.m, 1)
    const startPad = (first.getDay() + 6) % 7
    const total = daysInMonth(calMonth.y, calMonth.m)
    const cells: Array<{ iso: string | null; day: number | null }> = []
    for (let i = 0; i < startPad; i++) cells.push({ iso: null, day: null })
    for (let d = 1; d <= total; d++) {
      const iso = `${calMonth.y}-${String(calMonth.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      cells.push({ iso, day: d })
    }
    return cells
  }, [calMonth])

  const card: CSSProperties = {
    background: 'var(--panel, #fff)',
    border: '1px solid var(--border, #e5e7eb)',
    borderRadius: 16,
    padding: 16,
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[7, 30, 90].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => preset(n)}
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                border: daysQuick === n ? 'none' : '1px solid var(--border, #e5e7eb)',
                background: daysQuick === n ? '#0f172a' : 'transparent',
                color: daysQuick === n ? '#fff' : 'inherit',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {n} jours
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setDaysQuick(0) }} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border, #e5e7eb)' }} />
          <span className="muted">→</span>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setDaysQuick(0) }} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border, #e5e7eb)' }} />
        </div>
      </div>

      {error && (
        <div style={{ ...card, borderColor: '#fecdd3', background: '#fff1f2', color: '#be123c', fontWeight: 600 }}>{error}</div>
      )}

      {loading && !analytics && !revenus ? (
        <div className="muted" style={{ padding: 40, textAlign: 'center' }}>Chargement des indicateurs…</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            <Kpi icon={<Eye size={16} />} label="Vues" value={String(analytics?.pageViews ?? '—')} color={colors.views} />
            <Kpi icon={<Users size={16} />} label="Visiteurs" value={String(analytics?.visitors ?? revenus?.visitors ?? '—')} color="#0ea5e9" />
            <Kpi icon={<MousePointer2 size={16} />} label="Clics" value={String(analytics?.clicks ?? '—')} color={colors.clicks} />
            <Kpi icon={<FileInput size={16} />} label="Soumissions" value={String(analytics?.submissions ?? '—')} color={colors.submissions} />
            <Kpi icon={<Target size={16} />} label="Conversions" value={String(analytics?.conversions ?? '—')} color={colors.conversions} />
            <Kpi icon={<TrendingUp size={16} />} label="Taux conv." value={`${conversionRate.toFixed(1)} %`} color="#10b981" />
            <Kpi icon={<ShoppingBag size={16} />} label="Ventes" value={String(revenus?.salesCount ?? '—')} color={colors.sales} />
            <Kpi icon={<Wallet size={16} />} label="CA" value={revenus ? fmtMoney(revenus.revenueCents, currency) : '—'} color={colors.revenue} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: showCalendar ? 'minmax(0,1.4fr) minmax(280px,0.8fr)' : '1fr', gap: 16 }}>
            <div style={{ display: 'grid', gap: 16 }}>
              <section style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15 }}>Trafic & engagement</h3>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>Vues, clics, soumissions, conversions</p>
                  </div>
                  <SeriesToggles
                    keys={[
                      { key: 'views', label: 'Vues' },
                      { key: 'clicks', label: 'Clics' },
                      { key: 'submissions', label: 'Soumissions' },
                      { key: 'conversions', label: 'Conversions' },
                    ]}
                    colors={colors}
                    visible={visible}
                    onToggle={(k) => setVisible((v) => ({ ...v, [k]: !v[k] }))}
                    onColor={(k, c) => setColors((prev) => ({ ...prev, [k]: c }))}
                  />
                </div>
                <LineChart
                  data={trafficSeries}
                  series={[
                    { key: 'views', color: colors.views, visible: visible.views },
                    { key: 'clicks', color: colors.clicks, visible: visible.clicks },
                    { key: 'submissions', color: colors.submissions, visible: visible.submissions },
                    { key: 'conversions', color: colors.conversions, visible: visible.conversions },
                  ]}
                />
              </section>

              <section style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15 }}>Ventes & visites</h3>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>Commandes payées et trafic lié</p>
                  </div>
                  <SeriesToggles
                    keys={[
                      { key: 'sales', label: 'Ventes' },
                      { key: 'visits', label: 'Visites' },
                    ]}
                    colors={colors}
                    visible={visible}
                    onToggle={(k) => setVisible((v) => ({ ...v, [k]: !v[k] }))}
                    onColor={(k, c) => setColors((prev) => ({ ...prev, [k]: c }))}
                  />
                </div>
                <BarChart
                  byDay={salesSeries}
                  showSales={visible.sales}
                  showVisits={visible.visits}
                  salesColor={colors.sales}
                  visitsColor={colors.visits}
                  currency={currency}
                />
              </section>
            </div>

            <aside style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarDays size={16} color="#0f172a" />
                  <h3 style={{ margin: 0, fontSize: 15 }}>Calendrier</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCalendar((s) => !s)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    border: '1px solid var(--border, #e5e7eb)',
                    background: 'transparent',
                    borderRadius: 8,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {showCalendar ? (<><ChevronUp size={14} /> Masquer</>) : (<><ChevronDown size={14} /> Afficher</>)}
                </button>
              </div>

              {showCalendar && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <button type="button" className="outline" style={{ padding: '4px 10px' }} onClick={() => setCalMonth((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}>‹</button>
                    <strong style={{ fontSize: 13 }}>
                      {new Date(calMonth.y, calMonth.m, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </strong>
                    <button type="button" className="outline" style={{ padding: '4px 10px' }} onClick={() => setCalMonth((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}>›</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, fontSize: 11, textAlign: 'center', marginBottom: 4 }}>
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                      <span key={i} className="muted" style={{ fontWeight: 700 }}>{d}</span>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                    {calCells.map((c, i) => {
                      if (!c.iso) return <div key={`e-${i}`} />
                      const info = revenus?.calendar?.[c.iso]
                      const hasSales = (info?.sales || 0) > 0
                      const selected = c.iso === from && c.iso === to
                      return (
                        <button
                          key={c.iso}
                          type="button"
                          onClick={() => selectDay(c.iso!)}
                          title={info ? `${info.sales} vente(s) · ${fmtMoney(info.revenue_cents, currency)}` : c.iso}
                          style={{
                            aspectRatio: '1',
                            borderRadius: 10,
                            border: selected ? '2px solid #0f172a' : '1px solid transparent',
                            background: hasSales ? 'linear-gradient(145deg,#ffedd5,#fed7aa)' : 'var(--panel-2, #f8fafc)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: hasSales ? 700 : 500,
                            color: hasSales ? '#9a3412' : 'inherit',
                            position: 'relative',
                          }}
                        >
                          {c.day}
                          {hasSales && (
                            <span style={{ position: 'absolute', bottom: 3, left: '50%', transform: 'translateX(-50%)', width: 4, height: 4, borderRadius: 99, background: '#ea580c' }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                  <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
                    Cliquez un jour pour filtrer. Les jours orange ont des ventes.
                  </p>
                </>
              )}
            </aside>
          </div>

          <section style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>Commandes récentes</h3>
              <span className="muted" style={{ fontSize: 12 }}>{revenus?.orders?.length || 0} ligne(s)</span>
            </div>
            {!revenus?.orders?.length ? (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Aucune commande sur la période.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border, #e5e7eb)' }}>
                      <th style={{ padding: '8px 6px' }}>Date</th>
                      <th style={{ padding: '8px 6px' }}>Client</th>
                      <th style={{ padding: '8px 6px' }}>Produit</th>
                      <th style={{ padding: '8px 6px' }}>Tunnel</th>
                      <th style={{ padding: '8px 6px' }}>Montant</th>
                      <th style={{ padding: '8px 6px' }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenus.orders.slice(0, 40).map((o) => (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--border, #f1f5f9)' }}>
                        <td style={{ padding: '10px 6px', whiteSpace: 'nowrap' }}>{o.date.slice(0, 10)}</td>
                        <td style={{ padding: '10px 6px' }}>{o.buyer || '—'}</td>
                        <td style={{ padding: '10px 6px' }}>{o.product || '—'}</td>
                        <td style={{ padding: '10px 6px' }}>{o.funnel || '—'}</td>
                        <td style={{ padding: '10px 6px', fontWeight: 600 }}>{fmtMoney(o.amount_cents, o.currency || currency)}</td>
                        <td style={{ padding: '10px 6px' }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 99,
                              background: o.status === 'paid' ? '#ecfdf5' : '#f8fafc',
                              color: o.status === 'paid' ? '#047857' : '#64748b',
                            }}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: 'var(--panel, #fff)',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: 14,
        padding: 14,
        display: 'grid',
        gap: 8,
        borderTop: `3px solid ${color}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color }}>
        {icon}
        <small style={{ color: 'inherit', fontWeight: 700, fontSize: 11, letterSpacing: 0.2 }}>{label}</small>
      </div>
      <strong style={{ fontSize: 18, lineHeight: 1.2 }}>{value}</strong>
    </div>
  )
}

function SeriesToggles({
  keys,
  colors,
  visible,
  onToggle,
  onColor,
}: {
  keys: Array<{ key: string; label: string }>
  colors: Record<string, string>
  visible: Record<string, boolean>
  onToggle: (k: string) => void
  onColor: (k: string, c: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {keys.map((s) => (
        <label
          key={s.key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 8px',
            borderRadius: 999,
            border: `1px solid ${visible[s.key] ? colors[s.key] : 'var(--border, #e5e7eb)'}`,
            background: visible[s.key] ? `${colors[s.key]}18` : 'transparent',
            cursor: 'pointer',
            opacity: visible[s.key] ? 1 : 0.55,
          }}
        >
          <input type="checkbox" checked={!!visible[s.key]} onChange={() => onToggle(s.key)} style={{ accentColor: colors[s.key] }} />
          <input
            type="color"
            value={colors[s.key] || '#64748b'}
            onChange={(e) => onColor(s.key, e.target.value)}
            title={`Couleur ${s.label}`}
            style={{ width: 18, height: 18, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
          />
          {s.label}
        </label>
      ))}
    </div>
  )
}
