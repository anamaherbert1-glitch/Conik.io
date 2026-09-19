'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { PAYMENT_GATEWAYS } from '@/lib/payment-gateways'
import { OFFICIAL_PAYMENT_LOGOS } from '@/lib/payment-provider-logos'

type Provider = { id: string; provider: string; label: string; status: string; created_at?: string }

export function PaymentProvidersPanel({ initial }: { initial: Provider[] }) {
  const [list, setList] = useState(initial)

  const connectedMap = useMemo(() => {
    const m = new Map<string, Provider[]>()
    for (const p of list) {
      const arr = m.get(p.provider) || []
      arr.push(p)
      m.set(p.provider, arr)
    }
    return m
  }, [list])

  async function remove(id: string) {
    if (!confirm('Déconnecter ce prestataire ?')) return
    const r = await fetch(`/api/payments/providers/${id}`, { method: 'DELETE' })
    if (r.ok) setList((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {PAYMENT_GATEWAYS.map((g) => {
        const connected = connectedMap.get(g.id) || []
        const logoUrl = OFFICIAL_PAYMENT_LOGOS[g.id] || g.logoUrl
        return (
          <div
            key={g.id}
            className="panel"
            style={{
              margin: 0,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: g.bg || '#f8fafc',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                padding: 6,
                border: '1px solid var(--border, #e5e7eb)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={`${g.name} logo`}
                referrerPolicy="no-referrer"
                width={36}
                height={36}
                style={{ maxWidth: '100%', maxHeight: 34, objectFit: 'contain' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const sib = e.currentTarget.nextElementSibling as HTMLElement | null
                  if (sib) sib.style.display = 'grid'
                }}
              />
              <span
                style={{
                  display: 'none',
                  placeItems: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: g.bg,
                  color: g.color,
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                {g.name.slice(0, 2).toUpperCase()}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 16,
                    letterSpacing: '-0.02em',
                    color: g.color || 'inherit',
                  }}
                >
                  {g.name}
                </span>
                {connected.length > 0 && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#059669',
                      background: '#ECFDF5',
                      padding: '2px 8px',
                      borderRadius: 999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Check size={12} /> Connecté
                  </span>
                )}
              </div>
              {connected.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 4,
                    fontSize: 12,
                    marginRight: 8,
                  }}
                >
                  <span className="muted">
                    {p.label} · {p.status}
                  </span>
                  <button type="button" className="outline" style={{ padding: '2px 6px' }} onClick={() => void remove(p.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <Link
              href={`/integrations/payments/${g.id}`}
              className={connected.length ? 'outline' : 'primary'}
              style={{ textDecoration: 'none', padding: '10px 16px', borderRadius: 10, fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {connected.length ? 'Ajouter / reconnecter' : 'Connecter'}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
