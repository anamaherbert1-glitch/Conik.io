'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { CalendarDays, Eye, MousePointer2, FileInput, Target, TrendingUp, Users } from 'lucide-react'

type Day = { date: string; views: number; clicks: number; submissions: number; conversions: number }
type Analytics = {
  pageViews: number
  visitors: number
  clicks: number
  submissions: number
  leads: number
  conversions: number
  revenue: number | null
  revenueByCurrency: Record<string, number>
  byDay: Day[]
}

const SERIES = [
  { key: 'views' as const, label: 'Vues', default: '#2563EB' },
  { key: 'clicks' as const, label: 'Clics', default: '#7C3AED' },
  { key: 'submissions' as const, label: 'Soumissions', default: '#0891B2' },
  { key: 'conversions' as const, label: 'Conversions', default: '#059669' },
]

const PRESET_COLORS = ['#2563EB', '#7C3AED', '#0891B2', '#059669', '#EA580C', '#E11D48', '#0F172A', '#D97706']

function formatDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [colors, setColors] = useState<Record<string, string>>(() =>
    Object.fromEntries(SERIES.map((s) => [s.key, s.default])),
  )
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SERIES.map((s) => [s.key, true])),
  )
  const [openColor, setOpenColor] = useState<string | null>(null)
  const [calOpen, setCalOpen] = useState(false)
  const calRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`/api/analytics?days=${days}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || 'Impossible de charger les statistiques')
        return r.json()
      })
      .then((j) => {
        if (!cancelled) setData(j)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [days])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false)
      if (!(e.target as HTMLElement).closest?.('[data-color-pop]')) setOpenColor(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const conversionRate = useMemo(
    () => (data && data.pageViews ? (data.conversions / data.pageViews) * 100 : 0),
    [data],
  )

  const card: React.CSSProperties = {
    background: 'var(--panel, #fff)',
    border: '1px solid var(--border, #e5e7eb)',
    borderRadius: 16,
    padding: 16,
  }

  return (
    <AppShell active="Analytics">
      <header>
        <div>
          <small style={{ fontWeight: 700, color: '#64748b', letterSpacing: 0.3 }}>PERFORMANCE</small>
          <h1 style={{ marginTop: 4 }}>Analytics</h1>
          <p className="muted">Trafic, clics, soumissions et conversions de vos tunnels.</p>
        </div>
        <div className="button-row" style={{ position: 'relative' }} ref={calRef}>
          {[7, 30, 90].map((d) => (
            <button key={d} className={days === d ? 'primary' : 'outline'} onClick={() => setDays(d)}>
              {d} j
            </button>
          ))}
          <button
            type="button"
            className="outline"
            onClick={() => setCalOpen((v) => !v)}
            title="Période"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <CalendarDays size={16} />
            Période
          </button>
          {calOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                zIndex: 40,
                width: 260,
                background: 'var(--panel, #fff)',
                border: '1px solid var(--border, #e5e7eb)',
                borderRadius: 14,
                boxShadow: '0 12px 40px rgba(15,23,42,0.14)',
                padding: 14,
              }}
            >
              <b style={{ fontSize: 13 }}>Choisir la période</b>
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                {[7, 14, 30, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDays(d)
                      setCalOpen(false)
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: days === d ? '1.5px solid #0f172a' : '1px solid var(--border, #e5e7eb)',
                      background: days === d ? '#0f172a' : 'transparent',
                      color: days === d ? '#fff' : 'inherit',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Derniers {d} jours
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div style={{ ...card, borderColor: '#fecdd3', background: '#fff1f2', color: '#be123c', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && !data ? (
        <p className="muted">Chargement…</p>
      ) : data ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
            <Kpi icon={<Eye size={15} />} label="Vues" value={String(data.pageViews)} color={colors.views} />
            <Kpi icon={<Users size={15} />} label="Visiteurs" value={String(data.visitors)} color="#0ea5e9" />
            <Kpi icon={<MousePointer2 size={15} />} label="Clics" value={String(data.clicks)} color={colors.clicks} />
            <Kpi icon={<FileInput size={15} />} label="Soumissions" value={String(data.submissions)} color={colors.submissions} />
            <Kpi icon={<Target size={15} />} label="Conversions" value={String(data.conversions)} color={colors.conversions} />
            <Kpi icon={<TrendingUp size={15} />} label="Taux" value={`${conversionRate.toFixed(1)} %`} color="#10b981" />
          </div>

          <section style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>Évolution</h3>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>Cliquez la pastille colorée pour changer la couleur</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SERIES.map((s) => (
                  <div key={s.key} data-color-pop style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={() => setVisible((v) => ({ ...v, [s.key]: !v[s.key] }))}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 10px 6px 8px',
                        borderRadius: 999,
                        border: `1.5px solid ${visible[s.key] ? colors[s.key] : 'var(--border,#e5e7eb)'}`,
                        background: visible[s.key] ? `${colors[s.key]}14` : 'transparent',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 12,
                        opacity: visible[s.key] ? 1 : 0.45,
                      }}
                    >
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenColor(openColor === s.key ? null : s.key)
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 6,
                          background: colors[s.key],
                          boxShadow: `0 0 0 2px #fff, 0 0 0 3px ${colors[s.key]}55`,
                          flexShrink: 0,
                        }}
                      />
                      {s.label}
                    </button>
                    {openColor === s.key && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 8px)',
                          left: 0,
                          zIndex: 30,
                          background: 'var(--panel,#fff)',
                          border: '1px solid var(--border,#e5e7eb)',
                          borderRadius: 12,
                          padding: 10,
                          boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 28px)',
                          gap: 8,
                        }}
                      >
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              setColors((prev) => ({ ...prev, [s.key]: c }))
                              setOpenColor(null)
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: c,
                              border: colors[s.key] === c ? '2px solid #0f172a' : '2px solid transparent',
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                        <label style={{ gridColumn: '1 / -1', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          Personnalisé
                          <input
                            type="color"
                            value={colors[s.key]}
                            onChange={(e) => setColors((prev) => ({ ...prev, [s.key]: e.target.value }))}
                            style={{ width: 32, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <LineChart data={data.byDay} colors={colors} visible={visible} />
          </section>
        </div>
      ) : null}
    </AppShell>
  )
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: 'var(--panel,#fff)',
        border: '1px solid var(--border,#e5e7eb)',
        borderRadius: 14,
        padding: 14,
        borderTop: `3px solid ${color}`,
        display: 'grid',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color }}>
        {icon}
        <small style={{ fontWeight: 700, fontSize: 11 }}>{label}</small>
      </div>
      <strong style={{ fontSize: 18 }}>{value}</strong>
    </div>
  )
}

function LineChart({
  data,
  colors,
  visible,
}: {
  data: Day[]
  colors: Record<string, string>
  visible: Record<string, boolean>
}) {
  const width = 720
  const height = 240
  const pad = { top: 16, right: 16, bottom: 32, left: 40 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const keys = SERIES.map((s) => s.key).filter((k) => visible[k])
  const max = Math.max(1, ...data.flatMap((d) => keys.map((k) => Number(d[k] || 0))))

  if (!data.length) {
    return <p className="muted" style={{ textAlign: 'center', padding: 24 }}>Pas encore de données.</p>
  }

  const labels = data.filter((_, i) => data.length <= 10 || i % Math.ceil(data.length / 8) === 0 || i === data.length - 1)

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: 480, height: 'auto', display: 'block' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + innerH * (1 - t)
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="currentColor" opacity={0.08} />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity={0.5}>
                {Math.round(max * t)}
              </text>
            </g>
          )
        })}
        {keys.map((key) => {
          const pts = data
            .map((d, i) => {
              const x = pad.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
              const y = pad.top + innerH - (Number(d[key] || 0) / max) * innerH
              return `${x},${y}`
            })
            .join(' ')
          return (
            <g key={key}>
              <polyline fill="none" stroke={colors[key]} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={pts} />
              {data.map((d, i) => {
                if (!d[key]) return null
                const x = pad.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
                const y = pad.top + innerH - (Number(d[key] || 0) / max) * innerH
                return <circle key={`${key}-${i}`} cx={x} cy={y} r={3} fill={colors[key]} />
              })}
            </g>
          )
        })}
        {labels.map((d) => {
          const i = data.indexOf(d)
          const x = pad.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
          return (
            <text key={d.date} x={x} y={height - 10} textAnchor="middle" fontSize="10" fill="currentColor" opacity={0.55}>
              {formatDate(d.date)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
