'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  async function load() {
    setBusy(true); setError('')
    try { const r = await fetch('/api/whatsapp/templates', { cache: 'no-store' }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Synchronisation impossible.'); setTemplates(j.templates || []) }
    catch (e) { setError(e instanceof Error ? e.message : 'Synchronisation impossible.') }
    finally { setBusy(false) }
  }
  useEffect(() => { load() }, [])
  const filtered = templates.filter(t => `${t.name} ${t.language} ${t.category} ${t.status}`.toLowerCase().includes(q.toLowerCase()))
  return <AppShell active="WhatsApp">
    <header><div><small>WHATSAPP / TEMPLATES</small><h1>Templates WhatsApp</h1><p className="muted">Liste issue de la connexion Meta de votre organisation.</p></div><div style={{display:'flex',gap:8}}><Link className="outline" href="/whatsapp">WhatsApp</Link><button className="primary" onClick={load} disabled={busy}>{busy ? 'Synchronisation…' : 'Synchroniser Meta'}</button></div></header>
    {error && <div className="error">{error}</div>}
    <section className="panel" style={{display:'grid',gap:14}}><input className="form-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher un template…" />{filtered.length ? <div className="funnel-table">{filtered.map(t => <div className="funnel-row" key={`${t.id || t.name}-${t.language}`}><div><b>{t.name}</b><span>{t.language} · {t.category || '—'} · {t.status}</span></div><span>{t.rejected_reason || ''}</span></div>)}</div> : <div className="empty"><b>Aucun template</b><span>Connectez WhatsApp et synchronisez les templates approuvés depuis Meta.</span></div>}</section>
  </AppShell>
}
