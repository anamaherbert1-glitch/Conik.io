'use client'

type DayPoint = { date: string; sales: number; revenue_cents: number; visits: number; pending: number }

function formatDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
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

export function LineChart({
  data,
  series,
}: {
  data: Array<Record<string, string | number>>
  series: Array<{ key: string; color: string; visible: boolean }>
}) {
  const width = 720
  const height = 220
  const pad = { top: 16, right: 16, bottom: 32, left: 40 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const active = series.filter((s) => s.visible)
  const max = Math.max(1, ...data.flatMap((d) => active.map((s) => Number(d[s.key] || 0))))

  if (!data.length) {
    return (
      <p className="muted" style={{ margin: 0, fontSize: 13, padding: 24, textAlign: 'center' }}>
        Pas encore de données sur cette période.
      </p>
    )
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
        {active.map((s) => {
          const pts = data
            .map((d, i) => {
              const x = pad.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
              const y = pad.top + innerH - (Number(d[s.key] || 0) / max) * innerH
              return `${x},${y}`
            })
            .join(' ')
          return (
            <g key={s.key}>
              <polyline fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={pts} />
              {data.map((d, i) => {
                if (Number(d[s.key] || 0) === 0) return null
                const x = pad.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
                const y = pad.top + innerH - (Number(d[s.key] || 0) / max) * innerH
                return <circle key={`${s.key}-${i}`} cx={x} cy={y} r={3} fill={s.color} />
              })}
            </g>
          )
        })}
        {labels.map((d) => {
          const i = data.indexOf(d)
          const x = pad.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
          return (
            <text key={String(d.date)} x={x} y={height - 10} textAnchor="middle" fontSize="10" fill="currentColor" opacity={0.55}>
              {formatDate(String(d.date))}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export function BarChart({
  byDay,
  showSales,
  showVisits,
  salesColor,
  visitsColor,
  currency,
}: {
  byDay: DayPoint[]
  showSales: boolean
  showVisits: boolean
  salesColor: string
  visitsColor: string
  currency: string
}) {
  const h = 170
  const maxSales = Math.max(1, ...byDay.map((d) => d.sales))
  const maxVisits = Math.max(1, ...byDay.map((d) => d.visits))

  if (!byDay.length) {
    return (
      <p className="muted" style={{ margin: 0, fontSize: 13, padding: 24, textAlign: 'center' }}>
        Pas encore de ventes sur cette période.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: h, overflowX: 'auto', paddingBottom: 28 }}>
      {byDay.map((d) => {
        const salesH = showSales ? Math.max(2, (d.sales / maxSales) * (h - 24)) : 0
        const visitsH = showVisits ? Math.max(2, (d.visits / maxVisits) * (h - 24) * 0.55) : 0
        return (
          <div
            key={d.date}
            title={`${d.date}\n${d.sales} vente(s) · ${fmtMoney(d.revenue_cents, currency)}\n${d.visits} visite(s)`}
            style={{
              flex: '1 0 10px',
              minWidth: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              height: '100%',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', justifyContent: 'center' }}>
              {showSales && <div style={{ width: '42%', height: salesH, borderRadius: '4px 4px 0 0', background: salesColor }} />}
              {showVisits && (
                <div style={{ width: '42%', height: visitsH, borderRadius: '4px 4px 0 0', background: visitsColor, opacity: 0.75 }} />
              )}
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
