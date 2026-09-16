'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'

export default function NewCampaign() {
  const [funnels, setFunnels] = useState<any[]>([])
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('')
  const [description, setDescription] = useState('')
  const [funnel, setFunnel] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [audience, setAudience] = useState('all_contacts')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/funnels')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setFunnels(j?.funnels || []))
      .catch(() => {})
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const r = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        status: 'draft',
        funnel_id: funnel || null,
        goal: goal || null,
        description: description || null,
        channel,
        audience,
        message: message || null,
      }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setError(j.error || 'Impossible de créer la campagne')
      setSaving(false)
      return
    }
    location.href = `/campaigns/${j.campaign.id}`
  }

  return (
    <AppShell active="Campaigns">
      <header>
        <div>
          <small>CAMPAGNES</small>
          <h1>Nouvelle campagne</h1>
          <p className="muted">
            Dites à Conik : quelle offre, vers qui, via quel canal, et avec quel message. Rien n’est envoyé tant que vous n’activez pas l’envoi plus tard.
          </p>
        </div>
      </header>

      <section className="panel">
        <form onSubmit={save} style={{ display: 'grid', gap: 16, maxWidth: 680 }}>
          <label>
            Nom de la campagne
            <input className="form-input" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Lancement Formule" />
          </label>

          <label>
            Objectif
            <input className="form-input" maxLength={240} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Remplir le live, vendre l’offre, relancer les prospects…" />
          </label>

          <label>
            Description interne
            <textarea className="form-input" rows={3} maxLength={800} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes pour vous : dates, offre, conditions…" />
          </label>

          <label>
            Tunnel lié
            <select className="form-input" value={funnel} onChange={(e) => setFunnel(e.target.value)}>
              <option value="">Aucun tunnel</option>
              {funnels.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <div className="form-grid">
            <label>
              Canal prévu
              <select className="form-input" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
                <option value="internal">Interne seulement</option>
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
            Message de la campagne
            <textarea className="form-input" rows={5} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Bonjour {'{{prenom}}'}, votre place pour le live est ouverte…" />
          </label>

          <p className="muted" style={{ margin: 0 }}>
            Étape 1 : enregistrer le plan. Étape 2 (plus tard) : envoyer vraiment via WhatsApp / e-mail.
          </p>

          {error && <div className="error">{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary" disabled={saving}>
              {saving ? 'Création…' : 'Créer la campagne'}
            </button>
            <Link className="outline" href="/campaigns">
              Annuler
            </Link>
          </div>
        </form>
      </section>
    </AppShell>
  )
}
