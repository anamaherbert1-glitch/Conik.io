'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/app-shell'

export default function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('')
  const [campaign, setCampaign] = useState<any>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('draft')
  const [goal, setGoal] = useState('')
  const [description, setDescription] = useState('')
  const [funnels, setFunnels] = useState<any[]>([])
  const [funnel, setFunnel] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [audience, setAudience] = useState('all_contacts')
  const [message, setMessage] = useState('')
  const [contacts, setContacts] = useState<any[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    params.then((p) => setId(p.id))
  }, [params])

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch('/api/campaigns').then((r) => r.json()),
      fetch('/api/funnels').then((r) => r.json()),
      fetch('/api/contacts').then((r) => r.json()),
    ])
      .then(([c, f, ct]) => {
        const x = (c.campaigns || []).find((v: any) => v.id === id)
        if (!x) {
          setError('Campagne introuvable.')
          return
        }
        setCampaign(x)
        setName(x.name || '')
        setStatus(x.status || 'draft')
        setGoal(x.goal || '')
        setDescription(x.description || '')
        setFunnel(x.funnel_id || '')
        setChannel(x.channel || 'whatsapp')
        setAudience(x.audience || 'all_contacts')
        setMessage(x.message || '')
        setFunnels(f.funnels || [])
        setContacts(ct.contacts || [])
      })
      .catch(() => setError('Impossible de charger la campagne'))
  }, [id])

  const audienceCount = useMemo(() => {
    if (audience === 'with_phone') return contacts.filter((c) => c.phone || c.whatsapp_number).length
    if (audience === 'with_email') return contacts.filter((c) => c.email).length
    return contacts.length
  }, [audience, contacts])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const r = await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        status,
        funnel_id: funnel || null,
        goal: goal || null,
        description: description || null,
        channel,
        audience,
        message: message || null,
      }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Impossible d’enregistrer')
    else setCampaign(j.campaign)
    setSaving(false)
  }

  async function remove() {
    if (!confirm('Supprimer cette campagne ?')) return
    const r = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
    if (r.ok) location.href = '/campaigns'
    else {
      const j = await r.json().catch(() => ({}))
      setError(j.error || 'Impossible de supprimer')
    }
  }

  if (error && !campaign) {
    return (
      <AppShell active="Campaigns">
        <div className="error">{error}</div>
        <Link href="/campaigns" className="outline">
          Retour
        </Link>
      </AppShell>
    )
  }

  return (
    <AppShell active="Campaigns">
      <header>
        <div>
          <small>CAMPAGNE</small>
          <h1>{campaign?.name || 'Campagne'}</h1>
          <p className="muted">Préparez le plan. L’envoi automatique n’est pas encore déclenché depuis cette page.</p>
        </div>
      </header>

      <section className="panel" style={{ marginBottom: 14 }}>
        <b>Comment l’utiliser</b>
        <p className="muted" style={{ margin: '6px 0 0' }}>
          1. Remplissez l’offre, le tunnel et le message. 2. Choisissez le public ({audienceCount} contact{audienceCount > 1 ? 's' : ''} visés actuellement). 3. Passez en Active quand le plan est prêt. 4. L’envoi WhatsApp/e-mail groupé sera branché ensuite.
        </p>
      </section>

      <section className="panel">
        <form onSubmit={save} style={{ display: 'grid', gap: 16, maxWidth: 680 }}>
          <label>
            Nom
            <input className="form-input" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Objectif
            <input className="form-input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Relancer les prospects du tunnel" />
          </label>
          <label>
            Description interne
            <textarea className="form-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

          <div className="form-grid">
            <label>
              Statut
              <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">Brouillon</option>
                <option value="active">Active</option>
                <option value="paused">En pause</option>
                <option value="archived">Archivée</option>
              </select>
            </label>
            <label>
              Canal prévu
              <select className="form-input" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
                <option value="internal">Interne seulement</option>
              </select>
            </label>
          </div>

          <div className="form-grid">
            <label>
              Tunnel
              <select className="form-input" value={funnel} onChange={(e) => setFunnel(e.target.value)}>
                <option value="">Aucun tunnel</option>
                {funnels.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Public visé
              <select className="form-input" value={audience} onChange={(e) => setAudience(e.target.value)}>
                <option value="all_contacts">Tous les contacts</option>
                <option value="with_phone">Contacts avec téléphone</option>
                <option value="with_email">Contacts avec e-mail</option>
                <option value="funnel_leads">Prospects du tunnel</option>
              </select>
            </label>
          </div>

          <label>
            Message
            <textarea className="form-input" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>

          {error && <div className="error">{error}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" className="outline" onClick={remove}>
              Supprimer
            </button>
            <Link className="outline" href="/campaigns">
              Retour
            </Link>
          </div>
        </form>
      </section>
    </AppShell>
  )
}
