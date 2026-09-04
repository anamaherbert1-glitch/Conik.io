'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'

type Action = { id?: string; action_type: string; action_config: Record<string, any>; position?: number }
type Automation = { id: string; name: string; trigger_type: string; trigger_config: Record<string, any>; status: string; actions: Action[] }

const ACTIONS = [
  ['send_whatsapp', 'Envoyer WhatsApp'],
  ['wait', 'Attendre'],
  ['add_tag', 'Ajouter un tag'],
  ['remove_tag', 'Supprimer un tag'],
  ['update_contact', 'Mettre à jour le contact'],
  ['internal_log', 'Journal interne'],
  ['start_automation', 'Démarrer une automatisation'],
  ['stop_automation', 'Arrêter une automatisation'],
  ['notify_team', 'Notifier l’équipe'],
] as const

function emptyAction(type = 'send_whatsapp'): Action {
  return { action_type: type, action_config: type === 'wait' ? { minutes: 5 } : {} }
}

export default function AutomationDetail({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('')
  const [a, setA] = useState<Automation | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('draft')
  const [triggerType, setTriggerType] = useState('new_contact')
  const [actions, setActions] = useState<Action[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { params.then(p => setId(p.id)) }, [params])

  async function load() {
    if (!id) return
    setError('')
    try {
      const data = await fetch('/api/automations', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j })
      const found = (data.automations || []).find((v: Automation) => v.id === id)
      if (!found) throw new Error('Automatisation introuvable.')
      setA(found); setName(found.name); setStatus(found.status); setTriggerType(found.trigger_type); setActions(found.actions || [])
      const [h, t] = await Promise.all([
        fetch(`/api/automations/${id}/executions`, { cache: 'no-store' }).then(r => r.ok ? r.json() : { executions: [] }),
        fetch('/api/whatsapp/templates', { cache: 'no-store' }).then(r => r.ok ? r.json() : { templates: [] }),
      ])
      setHistory(h.executions || [])
      setTemplates(t.templates || [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossible de charger l’automatisation.') }
  }

  useEffect(() => { load() }, [id])

  function updateAction(index: number, patch: Partial<Action>) {
    setActions(prev => prev.map((x, i) => i === index ? { ...x, ...patch } : x))
  }
  function updateConfig(index: number, key: string, value: any) {
    setActions(prev => prev.map((x, i) => i === index ? { ...x, action_config: { ...x.action_config, [key]: value } } : x))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const r = await fetch(`/api/automations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, status, trigger_type: triggerType, trigger_config: a?.trigger_config || {}, actions: actions.map(({ action_type, action_config }) => ({ action_type, action_config })) }) })
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Impossible d’enregistrer')
      setA(j.automation); setActions(j.automation.actions || actions)
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossible d’enregistrer') }
    finally { setSaving(false) }
  }

  async function remove() {
    if (!confirm('Supprimer cette automatisation ?')) return
    const r = await fetch(`/api/automations/${id}`, { method: 'DELETE' })
    if (r.ok) location.href = '/automations'; else setError('Impossible de supprimer l’automatisation')
  }

  if (!a && !error) return <AppShell active="Automations"><div className="panel">Chargement…</div></AppShell>
  if (error && !a) return <AppShell active="Automations"><div className="error">{error}</div><Link href="/automations" className="outline">Retour</Link></AppShell>

  return <AppShell active="Automations">
    <header><div><small>AUTOMATISATION</small><h1>{a?.name || 'Automatisation'}</h1><p className="muted">Configurez les actions qui seront réellement exécutées par le moteur CONIK.</p></div></header>

    <form onSubmit={save} style={{ display: 'grid', gap: 18 }}>
      <section className="panel" style={{ display: 'grid', gap: 14 }}>
        <h2 style={{ margin: 0 }}>Déclencheur</h2>
        <label>Nom<input className="form-input" value={name} onChange={e => setName(e.target.value)} required /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          <label>Événement<select className="form-input" value={triggerType} onChange={e => setTriggerType(e.target.value)}><option value="new_contact">Nouveau contact</option><option value="form_submission">Soumission de formulaire</option><option value="whatsapp_message_received">WhatsApp reçu</option><option value="whatsapp_opt_in">WhatsApp opt-in</option><option value="whatsapp_opt_out">WhatsApp opt-out</option><option value="whatsapp_message_delivered">WhatsApp livré</option><option value="whatsapp_message_read">WhatsApp lu</option><option value="whatsapp_message_failed">WhatsApp échoué</option></select></label>
          <label>Statut<select className="form-input" value={status} onChange={e => setStatus(e.target.value)}><option value="draft">Brouillon</option><option value="active">Active</option><option value="paused">En pause</option></select></label>
        </div>
      </section>

      <section className="panel" style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}><div><h2 style={{ margin: 0 }}>Actions</h2><p className="muted">Ordre d’exécution réel. Les délais sont planifiés sans bloquer la requête.</p></div><button type="button" className="outline" onClick={() => setActions(prev => [...prev, emptyAction()])}>+ Ajouter une action</button></div>
        {actions.length === 0 && <div className="empty">Aucune action. Ajoutez-en une pour que l’automatisation fasse quelque chose.</div>}
        {actions.map((action, index) => <div className="panel" key={`${action.id || 'new'}-${index}`} style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}><b>#{index + 1}</b><button type="button" className="outline" onClick={() => setActions(prev => prev.filter((_, i) => i !== index))}>Supprimer</button></div>
          <select className="form-input" value={action.action_type} onChange={e => updateAction(index, { action_type: e.target.value, action_config: e.target.value === 'wait' ? { minutes: 5 } : {} })}>{ACTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          {action.action_type === 'send_whatsapp' && <div style={{ display: 'grid', gap: 10 }}>
            <label>Template WhatsApp<select className="form-input" value={action.action_config.templateName || ''} onChange={e => updateConfig(index, 'templateName', e.target.value)}><option value="">Sélectionner un template approuvé</option>{templates.map(t => <option key={`${t.name}-${t.language}`} value={t.name}>{t.name} · {t.language} · {t.status}</option>)}</select></label>
            <label>Langue du template<input className="form-input" value={action.action_config.language || ''} onChange={e => updateConfig(index, 'language', e.target.value)} placeholder="fr_FR" /></label>
            <label>Variables (JSON)<textarea className="form-input" rows={4} value={action.action_config.variables ? JSON.stringify(action.action_config.variables, null, 2) : ''} onChange={e => { try { updateConfig(index, 'variables', e.target.value ? JSON.parse(e.target.value) : {}) } catch { /* validation serveur finale */ } }} placeholder='{"1":"{{contact.first_name}}"}' /></label>
            <small className="muted">Variables disponibles : {'{{contact.first_name}}'}, {'{{contact.last_name}}'}, {'{{contact.email}}'}, {'{{contact.phone}}'}, {'{{form.field}}'}.</small>
          </div>}
          {action.action_type === 'wait' && <label>Attendre (minutes)<input className="form-input" type="number" min="1" max="10080" value={action.action_config.minutes || 5} onChange={e => updateConfig(index, 'minutes', Number(e.target.value))} /></label>}
          {(action.action_type === 'add_tag' || action.action_type === 'remove_tag') && <label>Tag<input className="form-input" value={action.action_config.tag || ''} onChange={e => updateConfig(index, 'tag', e.target.value)} placeholder="prospect" /></label>}
          {action.action_type === 'internal_log' && <label>Message<input className="form-input" value={action.action_config.message || ''} onChange={e => updateConfig(index, 'message', e.target.value)} /></label>}
        </div>)}
      </section>

      {error && <div className="error">{error}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}</button><button type="button" className="outline" onClick={remove}>Supprimer</button><Link className="outline" href="/automations">Retour</Link></div>
    </form>

    <section className="panel" style={{ marginTop: 18 }}>
      <h2>Historique d’exécution</h2>
      {history.length === 0 ? <div className="empty">Aucune exécution enregistrée.</div> : <div className="funnel-table">{history.map((x: any) => <div className="funnel-row" key={x.id}><div><b>{x.status}</b><span>{x.started_at || x.created_at || '—'} · contact {x.contact_id || '—'}</span></div><span>{x.error || '—'}</span></div>)}</div>}
    </section>
  </AppShell>
}
