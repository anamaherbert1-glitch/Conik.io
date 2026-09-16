'use client'

import { useState } from 'react'
import { CreditCard, Plus, Trash2 } from 'lucide-react'

type Provider = { id: string; provider: string; label: string; status: string; created_at?: string }

const LABELS: Record<string, string> = {
  wave: 'Wave',
  cinetpay: 'CinetPay',
  flutterwave: 'Flutterwave',
  other: 'Autre',
}

const FIELDS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  wave: [
    { key: 'api_key', label: 'Clé API Wave', placeholder: 'wave_...' },
    { key: 'api_secret', label: 'Secret API (si fourni)', placeholder: 'optionnel' },
  ],
  cinetpay: [
    { key: 'apikey', label: 'API Key CinetPay', placeholder: '...' },
    { key: 'site_id', label: 'Site ID', placeholder: '...' },
  ],
  flutterwave: [
    { key: 'public_key', label: 'Public key', placeholder: 'FLWPUBK_...' },
    { key: 'secret_key', label: 'Secret key', placeholder: 'FLWSECK_...' },
  ],
  other: [{ key: 'api_key', label: 'Clé / identifiant', placeholder: '...' }],
}

export function PaymentProvidersPanel({ initial }: { initial: Provider[] }) {
  const [list, setList] = useState(initial)
  const [provider, setProvider] = useState('wave')
  const [label, setLabel] = useState('')
  const [creds, setCreds] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function connect(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/payments/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          label: label || LABELS[provider] || provider,
          credentials: creds,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Impossible de connecter')
      setList((prev) => [j.provider, ...prev])
      setLabel('')
      setCreds({})
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

  const fields = FIELDS[provider] || FIELDS.other

  return (
    <div className="panel" style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div className="heading-icon" style={{ width: 36, height: 36, borderRadius: 9, background: '#fff1e6', color: '#ff6b00', display: 'grid', placeItems: 'center' }}>
          <CreditCard size={18} />
        </div>
        <div>
          <b>Prestataires de paiement</b>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Connectez votre compte Wave, CinetPay ou Flutterwave. Obligatoire avant d’activer une page de paiement dans un tunnel.
          </p>
        </div>
      </div>

      <form onSubmit={connect} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
        <label className="form-label">
          Prestataire
          <select className="form-input" value={provider} onChange={(e) => { setProvider(e.target.value); setCreds({}) }}>
            <option value="wave">Wave</option>
            <option value="cinetpay">CinetPay</option>
            <option value="flutterwave">Flutterwave</option>
            <option value="other">Autre</option>
          </select>
        </label>
        <label className="form-label">
          Nom d’affichage
          <input className="form-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`Mon compte ${LABELS[provider]}`} />
        </label>
        {fields.map((f) => (
          <label key={f.key} className="form-label">
            {f.label}
            <input
              className="form-input"
              value={creds[f.key] || ''}
              onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              autoComplete="off"
            />
          </label>
        ))}
        {error && <div className="error">{error}</div>}
        <button className="primary" disabled={busy} type="submit">
          <Plus size={15} /> {busy ? 'Connexion…' : 'Connecter le prestataire'}
        </button>
      </form>

      <div className="funnel-table">
        {list.length === 0 ? (
          <div className="empty" style={{ height: 'auto', padding: 20 }}>
            <b>Aucun prestataire</b>
            <span>Ajoutez Wave ou CinetPay pour débloquer les pages de paiement.</span>
          </div>
        ) : (
          list.map((p) => (
            <div className="funnel-row" key={p.id}>
              <div>
                <b>
                  {LABELS[p.provider] || p.provider} · {p.label}
                </b>
                <span>{p.status}</span>
              </div>
              <button type="button" className="outline" onClick={() => void remove(p.id)}>
                <Trash2 size={14} /> Retirer
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
