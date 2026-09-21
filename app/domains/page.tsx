'use client'

import { AppShell } from '@/components/app-shell'
import { FeatureGate } from '@/components/billing/feature-gate'
import { useEffect, useState } from 'react'

const STATUS_FR: Record<string, string> = {
  pending_dns: 'En attente DNS',
  verified: 'Vérifié',
  failed: 'DNS incorrect',
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<any[]>([])
  const [funnels, setFunnels] = useState<any[]>([])
  const [hostname, setHostname] = useState('')
  const [funnelId, setFunnelId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const [d, f] = await Promise.all([
      fetch('/api/domains', { cache: 'no-store' }),
      fetch('/api/funnels', { cache: 'no-store' }),
    ])
    const dj = await d.json().catch(() => ({}))
    const fj = await f.json().catch(() => ({}))
    if (!d.ok) throw new Error(dj.error || 'Impossible de charger les domaines.')
    setDomains(dj.domains || [])
    setFunnels(fj.funnels || [])
  }

  useEffect(() => {
    load().catch((e) => setError(e.message))
  }, [])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const r = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hostname: hostname.trim(), funnelId: funnelId || null }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Ajout impossible.')
      setHostname('')
      setFunnelId('')
      setMessage('Domaine ajouté. Vous pouvez maintenant vérifier son DNS.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ajout impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function verify(id: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const r = await fetch('/api/domains/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok && j.verified !== false) throw new Error(j.error || 'Vérification impossible.')
      if (j.verified) setMessage(j.message || 'DNS vérifié avec succès.')
      else setError(j.error || 'Le DNS ne pointe pas encore vers Vercel. Vérifiez votre configuration DNS puis réessayez.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vérification impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce domaine ?')) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const r = await fetch(`/api/domains?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Suppression impossible.')
      setMessage('Domaine supprimé.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell active="Domains">
      <FeatureGate feature="customDomain" requiredPlan="Premium">
      <header>
        <div>
          <small>DOMAINES</small>
          <h1>Domaines personnalisés</h1>
          <p className="muted">Associez un domaine à un tunnel et vérifiez son DNS avant publication.</p>
        </div>
      </header>

      <section className="panel" style={{ marginBottom: 18 }}>
        <h2>Ajouter un domaine</h2>
        <form
          onSubmit={add}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px,1fr) minmax(180px,1fr) auto',
            gap: 10,
            alignItems: 'end',
          }}
        >
          <label>
            Domaine
            <input
              className="form-input"
              placeholder="www.exemple.com"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              required
            />
          </label>
          <label>
            Tunnel
            <select className="form-input" value={funnelId} onChange={(e) => setFunnelId(e.target.value)}>
              <option value="">Aucun</option>
              {funnels.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>
          <button className="primary" disabled={busy}>
            {busy ? 'Traitement…' : 'Ajouter'}
          </button>
        </form>
      </section>

      {error && <div className="error" style={{ marginBottom: 12, whiteSpace: 'pre-wrap' }}>{error}</div>}
      {message && <div className="notice" style={{ marginBottom: 12 }}>{message}</div>}

      <section className="panel">
        {domains.length === 0 ? (
          <div className="empty">
            <b>Aucun domaine personnalisé</b>
            <span>Ajoutez votre premier domaine ci-dessus.</span>
          </div>
        ) : (
          <div className="funnel-table">
            {domains.map((d) => (
              <div className="funnel-row" key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <b>{d.hostname}</b>
                  <span>
                    {STATUS_FR[d.status] || d.status} ·{' '}
                    {d.funnel_id ? funnels.find((f) => f.id === d.funnel_id)?.name || 'Tunnel associé' : 'Aucun tunnel'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {d.status !== 'verified' && <button className="outline" onClick={() => verify(d.id)} disabled={busy}>Vérifier DNS</button>}
                  <button className="outline" onClick={() => remove(d.id)} disabled={busy}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      </FeatureGate>
    </AppShell>
  )
}
