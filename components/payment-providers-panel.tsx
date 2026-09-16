'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { PAYMENT_GATEWAYS } from '@/lib/payment-gateways'

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
    <div style={{ display: 'grid', gap: 20 }}>
      <p className="muted" style={{ margin: 0 }}>
        Choisissez un prestataire, puis <b>Connecter</b>. Vous serez guidé pour créer un compte sur le site officiel
        ou coller vos identifiants (comme sur systeme.io).
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        {PAYMENT_GATEWAYS.map((g) => {
          const connected = connectedMap.get(g.id) || []
          return (
            <div key={g.id} className="panel" style={{ margin: 0, padding: 16, display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: g.bg,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                    padding: 6,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.logoUrl}
                    alt={g.name}
                    style={{ maxWidth: '100%', maxHeight: 36, objectFit: 'contain' }}
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
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: g.bg,
                      color: g.color,
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    {g.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 15 }}>{g.name}</b>
                    {connected.length > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
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
                  <span className="muted" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
                    {g.countries}
                  </span>
                </div>
              </div>

              <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.4 }}>
                {g.description}
              </p>

              {connected.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--panel, #f2f3f7)',
                    fontSize: 13,
                  }}
                >
                  <span>
                    <b>{p.label}</b>
                    <span className="muted" style={{ marginLeft: 6 }}>
                      {p.status}
                    </span>
                  </span>
                  <button type="button" className="outline" style={{ padding: '4px 8px' }} onClick={() => void remove(p.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              <Link
                href={`/integrations/payments/${g.id}`}
                className={connected.length ? 'outline' : 'primary'}
                style={{ width: '100%', justifyContent: 'center', textAlign: 'center', textDecoration: 'none' }}
              >
                {connected.length ? 'Ajouter / reconnecter' : 'Connecter'}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
