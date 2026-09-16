'use client'

import { useEffect, useMemo, useState } from 'react'

export default function PublicPayPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState('')

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const funnel = q.get('funnel')
    const tarif = q.get('tarif')
    if (!funnel || !tarif) {
      setError('Lien de paiement invalide.')
      setLoading(false)
      return
    }
    fetch(`/api/payments/checkout?funnel=${encodeURIComponent(funnel)}&tarif=${encodeURIComponent(tarif)}`)
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || 'Paiement introuvable')
        setData(j)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [])

  const amountLabel = useMemo(() => {
    if (!data?.tariff) return ''
    const { amount_cents, currency } = data.tariff
    if (currency === 'XOF' || currency === 'XAF') return `${amount_cents.toLocaleString('fr-FR')} ${currency}`
    return `${(amount_cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`
  }, [data])

  const preview = useMemo(() => {
    if (!data?.page?.html) return ''
    return (
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      `<style>${data.page.css || ''}</style></head><body>${data.page.html}` +
      `<script>${data.page.js || ''}<` +
      '/script></body></html>'
    )
  }, [data])

  async function pay(e: React.FormEvent) {
    e.preventDefault()
    if (!data) return
    setBusy(true)
    setDone('')
    setError('')
    try {
      const r = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funnelId: data.funnel.id,
          tariffId: data.tariff.id,
          name,
          email,
          phone,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Paiement impossible')
      setDone(j.message || 'Commande enregistrée.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="page" style={{ maxWidth: 720 }}>
        <p className="muted">Chargement du paiement…</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="page" style={{ maxWidth: 720 }}>
        <div className="error">{error}</div>
      </div>
    )
  }

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <small style={{ letterSpacing: '.12em', fontWeight: 800 }}>PAIEMENT SÉCURISÉ</small>
      <h1 style={{ marginTop: 8 }}>{data.tariff.product_label || data.tariff.name}</h1>
      <p className="muted">
        Montant préconfiguré : <b style={{ color: 'var(--ink)' }}>{amountLabel}</b>
        {data.provider ? ` · via ${data.provider.label || data.provider.provider}` : ''}
      </p>

      {preview && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
          <iframe title="Page de paiement" sandbox="allow-scripts allow-forms" srcDoc={preview} style={{ width: '100%', height: 420, border: 0 }} />
        </div>
      )}

      <form onSubmit={pay} className="panel" style={{ marginTop: 16, display: 'grid', gap: 12, maxWidth: 480 }}>
        <b>Finaliser · {amountLabel}</b>
        <label className="form-label">
          Nom
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="form-label">
          E-mail
          <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="form-label">
          Téléphone
          <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+221…" />
        </label>
        {error && <div className="error">{error}</div>}
        {done && <div className="notice">{done}</div>}
        <button className="primary" disabled={busy}>
          {busy ? 'Traitement…' : `Payer ${amountLabel}`}
        </button>
        <p className="muted" style={{ margin: 0 }}>
          L’appel API Wave / CinetPay / Flutterwave sera branché à l’étape suivante. La commande et le montant sont déjà enregistrés.
        </p>
      </form>
    </div>
  )
}
