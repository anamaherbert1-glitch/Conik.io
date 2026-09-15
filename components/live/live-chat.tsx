'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'

type Message = { id: string; sender_type: 'host' | 'attendee'; sender_email: string | null; message: string; created_at: string }
type Props = { slug?: string; liveId?: string; host?: boolean; chatEnabled?: boolean }

export default function LiveChat({ slug, liveId, host = false, chatEnabled = true }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    if (host) {
      if (!liveId) return
      const r = await fetch(`/api/lives/chat?live_id=${encodeURIComponent(liveId)}`, { cache: 'no-store' })
      const j = await r.json().catch(() => ({})); if (r.ok) setMessages(j.messages || []); return
    }
    if (!slug) return
    const r = await fetch(`/api/lives/chat?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({})); if (r.ok) setMessages(j.messages || [])
  }, [host, liveId, slug])
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 2000); return () => window.clearInterval(timer) }, [load])
  async function send(e: FormEvent) {
    e.preventDefault(); const message = text.trim(); if (!message || sending || (!host && !chatEnabled)) return
    setSending(true); setError('')
    const body = host ? { live_id: liveId, message } : { slug, message }
    const r = await fetch('/api/lives/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Impossible d’envoyer le message.'); else { setText(''); await load() }
    setSending(false)
  }
  return <section className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 420 }}>
    <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12 }}><h3 style={{ margin: 0 }}>Chat du Live</h3><span className="muted" style={{ fontSize: 12 }}>{host ? 'Les messages des participants apparaissent ici.' : chatEnabled ? 'Les messages des participants apparaissent ici.' : 'Le chat a été désactivé par l’organisateur.'}</span></div>
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0', display: 'grid', gap: 8, alignContent: 'start' }}>
      {messages.length === 0 && <p className="muted" style={{ textAlign: 'center' }}>Aucun message pour le moment.</p>}
      {messages.map(m => <div key={m.id} style={{ padding: '9px 11px', borderRadius: 10, background: m.sender_type === 'host' ? 'var(--surface-2)' : 'var(--surface)', border: '1px solid var(--line)' }}><div style={{ fontSize: 12, fontWeight: 700 }}>{m.sender_type === 'host' ? 'Vous' : (m.sender_email || 'Participant')} <span className="muted" style={{ fontWeight: 400 }}>· {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div><div style={{ marginTop: 3, wordBreak: 'break-word' }}>{m.message}</div></div>)}
    </div>
    {error && <div className="error" style={{ marginBottom: 8 }}>{error}</div>}
    {host || chatEnabled ? <form onSubmit={send} style={{ display: 'flex', gap: 8 }}><input className="form-input" value={text} maxLength={1000} onChange={e => setText(e.target.value)} placeholder="Écrire un message…"/><button className="primary" disabled={sending || !text.trim()}>{sending ? '…' : 'Envoyer'}</button></form> : <div style={{ border:'1px solid var(--line)', borderRadius:10, padding:'10px 12px', textAlign:'center', fontSize:12, fontWeight:700, background:'var(--surface-2)' }}>🔒 Chat fermé — vous pouvez toujours regarder le Live.</div>}
  </section>
}
