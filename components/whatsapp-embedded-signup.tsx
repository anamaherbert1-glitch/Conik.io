'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, MessageCircle, RefreshCw, Unplug } from 'lucide-react'

type Connection = {
  id: string
  waba_id: string
  phone_number_id: string
  display_phone_number: string | null
  verified_name: string | null
  status: string
  quality_rating: string | null
  connected_at: string | null
  last_synced_at: string | null
  last_error: string | null
}

type Props = { initial: { connections: Connection[]; quota: any; stats: any } }

declare global { interface Window { FB?: any } }

export function WhatsAppEmbeddedSignup({ initial }: Props) {
  const [connections, setConnections] = useState(initial.connections || [])
  const [quota, setQuota] = useState(initial.quota)
  const [stats, setStats] = useState(initial.stats || {})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  async function refresh() {
    const response = await fetch('/api/whatsapp/connection', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Impossible de charger WhatsApp.')
    setConnections(data.connections || [])
    setQuota(data.quota)
    setStats(data.stats || {})
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/whatsapp/config', { cache: 'no-store' }).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).error || 'Configuration Meta manquante.')
      return r.json()
    }).then(({ appId }) => {
      if (cancelled) return
      const existing = document.getElementById('facebook-jssdk')
      if (existing) { setReady(true); return }
      ;(window as any).fbAsyncInit = () => {
        window.FB?.init({ appId, cookie: true, xfbml: true, version: 'v23.0' })
        if (!cancelled) setReady(true)
      }
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      document.body.appendChild(script)
    }).catch((e) => setError(e.message))
    return () => { cancelled = true }
  }, [])

  async function connect() {
    setBusy(true); setError('')
    try {
      const config = await fetch('/api/whatsapp/config', { cache: 'no-store' }).then(async (r) => {
        const data = await r.json(); if (!r.ok) throw new Error(data.error); return data
      })
      if (!window.FB) throw new Error('Le SDK Meta n’est pas encore prêt. Réessayez dans quelques secondes.')
      window.FB.login(async (response: any) => {
        try {
          const code = response?.authResponse?.code
          if (!code) throw new Error('Connexion Meta annulée ou code Embedded Signup absent.')
          const result = await fetch('/api/whatsapp/callback', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code }),
          }).then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Échec de connexion WhatsApp.'); return data })
          if (!result.ok) throw new Error('Meta n’a pas confirmé la connexion.')
          await refresh()
        } catch (e) { setError(e instanceof Error ? e.message : 'Échec de connexion WhatsApp.') }
        finally { setBusy(false) }
      }, {
        config_id: config.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { sessionInfoVersion: '3' },
      })
    } catch (e) { setError(e instanceof Error ? e.message : 'Échec de connexion WhatsApp.'); setBusy(false) }
  }

  async function disconnect(id: string) {
    if (!confirm('Déconnecter ce numéro WhatsApp de CONIK ? Les historiques seront conservés mais les envois seront arrêtés.')) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/whatsapp/connection', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ connectionId: id }) })
      const data = await response.json(); if (!response.ok) throw new Error(data.error)
      await refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Déconnexion impossible.') }
    finally { setBusy(false) }
  }

  const active = connections.filter((c) => c.status === 'connected')
  const sent = Number(stats.sent || 0)
  const delivered = Number(stats.delivered || 0)
  const deliveryRate = sent ? Math.round((delivered / sent) * 100) : 0

  return <section className="panel" style={{ display: 'grid', gap: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div>
        <small>WHATSAPP BUSINESS</small>
        <h2 style={{ margin: '6px 0' }}>Connectez votre propre numéro WhatsApp</h2>
        <p className="muted">Chaque organisation CONIK possède sa connexion Meta, son WABA, ses templates et ses conversations.</p>
      </div>
      <button className="button primary" onClick={connect} disabled={busy || !ready}>
        {busy ? <Loader2 size={16} className="spin" /> : <MessageCircle size={16} />}
        {ready ? 'Connecter WhatsApp' : 'Chargement Meta…'}
      </button>
    </div>

    {error && <div className="panel" style={{ borderColor: 'var(--danger, #dc2626)' }}>{error}</div>}

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
      <div className="panel"><small>Connexions actives</small><strong>{active.length}</strong></div>
      <div className="panel"><small>Messages envoyés</small><strong>{sent}</strong></div>
      <div className="panel"><small>Taux livré</small><strong>{deliveryRate}%</strong></div>
      <div className="panel"><small>Quota restant</small><strong>{quota?.remaining ?? '∞'}</strong></div>
    </div>

    {connections.length === 0 ? <div className="empty"><MessageCircle size={28} /><b>Aucun numéro WhatsApp connecté</b><span>Cliquez sur « Connecter WhatsApp » pour lancer Meta Embedded Signup.</span></div> : connections.map((c) => <div key={c.id} className="panel" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {c.status === 'connected' ? <CheckCircle2 size={24} /> : <Unplug size={24} />}
        <div><b>{c.verified_name || 'WhatsApp Business'}</b><div className="muted">{c.display_phone_number || c.phone_number_id} · {c.status}</div>{c.last_error && <div className="muted">{c.last_error}</div>}</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}><button className="button" onClick={() => refresh()} disabled={busy}><RefreshCw size={15} /> Actualiser</button>{c.status === 'connected' && <button className="button" onClick={() => disconnect(c.id)} disabled={busy}><Unplug size={15} /> Déconnecter</button>}</div>
    </div>)}
  </section>
}
