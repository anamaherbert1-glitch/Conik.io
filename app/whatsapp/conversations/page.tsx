'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'

export default function WhatsAppConversationsPage() {
  const [items, setItems] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  async function load(next = page) {
    setBusy(true); setError('')
    try { const r = await fetch(`/api/whatsapp/conversations?page=${next}&limit=25&q=${encodeURIComponent(q)}`, { cache: 'no-store' }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Impossible de charger les conversations.'); setItems(j.conversations || []); setTotal(j.total || 0); setPage(j.page || next) }
    catch (e) { setError(e instanceof Error ? e.message : 'Impossible de charger les conversations.') }
    finally { setBusy(false) }
  }
  useEffect(() => { load(1) }, [q])
  const pages = Math.max(1, Math.ceil(total / 25))
  return <AppShell active="WhatsApp">
    <header><div><small>WHATSAPP / INBOX</small><h1>Conversations</h1><p className="muted">Inbox partagé connecté aux conversations persistées par le webhook Meta.</p></div><Link className="outline" href="/whatsapp">Vue d’ensemble</Link></header>
    {error && <div className="error">{error}</div>}
    <section className="panel" style={{display:'grid',gap:14}}>
      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><input className="form-input" style={{flex:1,minWidth:220}} value={q} onChange={e=>setQ(e.target.value)} placeholder="Filtrer par statut…" /><button className="outline" onClick={()=>load(page)} disabled={busy}>{busy?'Chargement…':'Actualiser'}</button></div>
      {items.length ? <div className="funnel-table">{items.map((c:any)=><div key={c.id} className="funnel-row"><div><b>{[c.contact?.first_name,c.contact?.last_name].filter(Boolean).join(' ') || c.contact?.phone || 'Contact WhatsApp'}</b><span>{c.contact?.whatsapp_number || c.contact?.phone || '—'} · {c.status} · {c.last_message_at || '—'}</span></div><strong>{c.unread_count || 0}</strong></div>)}</div> : <div className="empty"><b>Aucune conversation</b><span>Les conversations apparaîtront après réception d’événements WhatsApp.</span></div>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><button className="outline" disabled={page<=1||busy} onClick={()=>load(page-1)}>Précédent</button><span className="muted">Page {page} / {pages}</span><button className="outline" disabled={page>=pages||busy} onClick={()=>load(page+1)}>Suivant</button></div>
    </section>
  </AppShell>
}
