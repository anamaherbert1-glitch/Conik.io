'use client'

import { useMemo, useState } from 'react'
import { Check, Link2, Plus, Trash2, X } from 'lucide-react'

type Provider = { id: string; provider: string; label: string; status: string; created_at?: string }

type GatewayDef = {
  id: string
  name: string
  description: string
  countries: string
  logoUrl?: string
  color: string
  bg: string
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[]
  docsUrl?: string
}

/** Logos officiels / ressources publiques des prestataires */
const GATEWAYS: GatewayDef[] = [
  {
    id: 'cinetpay',
    name: 'CinetPay',
    description: 'Mobile Money + cartes — Afrique francophone',
    countries: 'CI · TG · BF · ML · CM · SN · BJ · GN…',
    logoUrl: 'https://docs.cinetpay.com/images/logo-new.png',
    color: '#0B5FFF',
    bg: '#EEF4FF',
    fields: [
      { key: 'apikey', label: 'API Key', placeholder: 'Votre apikey CinetPay' },
      { key: 'site_id', label: 'Site ID', placeholder: 'Ex. 445566' },
      { key: 'secret_key', label: 'Secret key (si fourni)', placeholder: 'optionnel', secret: true },
    ],
    docsUrl: 'https://docs.cinetpay.com',
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    description: 'Panafricain — Mobile Money + cartes internationales',
    countries: 'Afrique + diaspora',
    logoUrl: 'https://cdn.brandfetch.io/idJHbFHlDW/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B',
    color: '#FB9129',
    bg: '#FFF6EC',
    fields: [
      { key: 'public_key', label: 'Public key', placeholder: 'FLWPUBK_…' },
      { key: 'secret_key', label: 'Secret key', placeholder: 'FLWSECK_…', secret: true },
      { key: 'encryption_key', label: 'Encryption key (optionnel)', placeholder: '…' },
    ],
    docsUrl: 'https://developer.flutterwave.com',
  },
  {
    id: 'paydunya',
    name: 'PayDunya',
    description: 'Sénégal & UEMOA — Wave, Orange, MTN, Moov + cartes',
    countries: 'SN · CI · BJ · BF · TG · ML',
    color: '#00A86B',
    bg: '#ECFBF4',
    fields: [
      { key: 'master_key', label: 'Master Key', placeholder: '…' },
      { key: 'private_key', label: 'Private Key', placeholder: '…', secret: true },
      { key: 'token', label: 'Token', placeholder: '…' },
    ],
    docsUrl: 'https://paydunya.com',
  },
  {
    id: 'wave',
    name: 'Wave',
    description: 'API marchand Wave — SN, CI, ML, BF…',
    countries: 'SN · CI · ML · BF · GM…',
    color: '#1DC8FF',
    bg: '#EAF9FF',
    fields: [
      { key: 'api_key', label: 'Clé API Wave', placeholder: 'wave_…' },
      { key: 'api_secret', label: 'Secret API', placeholder: 'optionnel', secret: true },
    ],
    docsUrl: 'https://developer.wave.com',
  },
  {
    id: 'ligdicash',
    name: 'LigdiCash',
    description: 'Burkina + multi-pays Ouest Afrique',
    countries: 'BF · CI · SN · ML · TG · BJ · CM…',
    color: '#6C2BD9',
    bg: '#F3EDFF',
    fields: [
      { key: 'apikey', label: 'Apikey', placeholder: '…' },
      { key: 'api_token', label: 'API Token (Bearer)', placeholder: 'eyJ…', secret: true },
    ],
    docsUrl: 'https://developers.ligdicash.com',
  },
  {
    id: 'hub2',
    name: 'Hub2',
    description: 'Orchestrateur multi-pays UEMOA / CEMAC',
    countries: 'CI · SN · CM · TG · BJ · BF…',
    color: '#111827',
    bg: '#F3F4F6',
    fields: [
      { key: 'client_id', label: 'Client ID', placeholder: '…' },
      { key: 'client_secret', label: 'Client Secret', placeholder: '…', secret: true },
      { key: 'merchant_id', label: 'Merchant ID (si fourni)', placeholder: 'optionnel' },
    ],
    docsUrl: 'https://hub2.io',
  },
  {
    id: 'fedapay',
    name: 'FedaPay',
    description: 'Bénin & UEMOA — MTN, Moov + cartes',
    countries: 'BJ · TG · SN · CI…',
    color: '#00B4A0',
    bg: '#E8FAF7',
    fields: [
      { key: 'public_key', label: 'Clé publique', placeholder: 'pk_…' },
      { key: 'secret_key', label: 'Clé secrète', placeholder: 'sk_…', secret: true },
    ],
    docsUrl: 'https://docs.fedapay.com',
  },
  {
    id: 'campay',
    name: 'CamPay',
    description: 'Cameroun — MTN MoMo & Orange Money',
    countries: 'Cameroun',
    color: '#E11D48',
    bg: '#FFF1F2',
    fields: [
      { key: 'username', label: 'Username / App username', placeholder: '…' },
      { key: 'password', label: 'Password', placeholder: '…', secret: true },
    ],
    docsUrl: 'https://www.campay.net',
  },
]

function Badge({ g }: { g: GatewayDef }) {
  if (g.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={g.logoUrl}
        alt={g.name}
        style={{
          height: 28,
          maxWidth: 120,
          objectFit: 'contain',
          display: 'block',
        }}
        onError={(e) => {
          const el = e.currentTarget
          el.style.display = 'none'
          const fallback = el.nextElementSibling as HTMLElement | null
          if (fallback) fallback.style.display = 'grid'
        }}
      />
    )
  }
  return (
    <span
      style={{
        display: 'grid',
        placeItems: 'center',
        width: 40,
        height: 40,
        borderRadius: 10,
        background: g.bg,
        color: g.color,
        fontWeight: 800,
        fontSize: 14,
        letterSpacing: '-0.02em',
      }}
    >
      {g.name.slice(0, 2).toUpperCase()}
    </span>
  )
}

export function PaymentProvidersPanel({ initial }: { initial: Provider[] }) {
  const [list, setList] = useState(initial)
  const [openId, setOpenId] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [creds, setCreds] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const connectedMap = useMemo(() => {
    const m = new Map<string, Provider[]>()
    for (const p of list) {
      const arr = m.get(p.provider) || []
      arr.push(p)
      m.set(p.provider, arr)
    }
    return m
  }, [list])

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://conik-io.vercel.app'

  async function connect(gatewayId: string) {
    setBusy(true)
    setError('')
    try {
      const g = GATEWAYS.find((x) => x.id === gatewayId)
      const r = await fetch('/api/payments/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: gatewayId,
          label: label || g?.name || gatewayId,
          credentials: creds,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Impossible de connecter')
      setList((prev) => [j.provider, ...prev])
      setLabel('')
      setCreds({})
      setOpenId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Déconnecter ce prestataire ?')) return
    const r = await fetch(`/api/payments/providers/${id}`, { method: 'DELETE' })
    if (r.ok) setList((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <p className="muted" style={{ margin: 0 }}>
        Connectez vos comptes prestataires (comme sur systeme.io). L’argent arrive sur{' '}
        <b>votre</b> compte marchand — Conik orchestre uniquement le paiement.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        {GATEWAYS.map((g) => {
          const connected = connectedMap.get(g.id) || []
          const isOpen = openId === g.id
          return (
            <div
              key={g.id}
              className="panel"
              style={{
                margin: 0,
                padding: 16,
                display: 'grid',
                gap: 12,
                border: isOpen ? `1.5px solid ${g.color}` : undefined,
              }}
            >
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
                  <Badge g={g} />
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

              {!isOpen ? (
                <button
                  type="button"
                  className={connected.length ? 'outline' : 'primary'}
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => {
                    setOpenId(g.id)
                    setCreds({})
                    setLabel('')
                    setError('')
                  }}
                >
                  <Plus size={15} /> {connected.length ? 'Ajouter un autre compte' : 'Connecter'}
                </button>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  <label className="form-label">
                    Nom d’affichage
                    <input
                      className="form-input"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder={`Mon compte ${g.name}`}
                    />
                  </label>
                  {g.fields.map((f) => (
                    <label key={f.key} className="form-label">
                      {f.label}
                      <input
                        className="form-input"
                        type={f.secret ? 'password' : 'text'}
                        value={creds[f.key] || ''}
                        onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        autoComplete="off"
                      />
                    </label>
                  ))}

                  <div
                    style={{
                      fontSize: 12,
                      padding: 10,
                      borderRadius: 8,
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      wordBreak: 'break-all',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Link2 size={13} />
                      <b>Webhook Conik</b>
                    </div>
                    <code style={{ fontSize: 11 }}>
                      {origin}/api/payments/webhook/{g.id}
                    </code>
                    <div className="muted" style={{ marginTop: 4, fontSize: 11 }}>
                      À coller dans le dashboard {g.name} (notifications de paiement).
                    </div>
                  </div>

                  {error && openId === g.id && <div className="error">{error}</div>}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="primary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      disabled={busy}
                      onClick={() => void connect(g.id)}
                    >
                      {busy ? 'Connexion…' : 'Enregistrer'}
                    </button>
                    <button
                      type="button"
                      className="outline"
                      onClick={() => {
                        setOpenId(null)
                        setError('')
                      }}
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {g.docsUrl && (
                    <a
                      href={g.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="muted"
                      style={{ fontSize: 12, textAlign: 'center' }}
                    >
                      Documentation {g.name} →
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
