'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import MultiLiveRoom from '@/components/live/multi-live-room'

function CohostChat({ token }: { token: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const r = await fetch(`/api/lives/cohost-chat?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (r.ok) setMessages(j.messages || [])
    else setError(j.error || 'Impossible de charger le chat.')
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), 2000)
    return () => window.clearInterval(timer)
  }, [token])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const message = text.trim()
    if (!message || sending) return
    setSending(true)
    setError('')
    const r = await fetch('/api/lives/cohost-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, message }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Impossible d’envoyer le message.')
    else { setText(''); await load() }
    setSending(false)
  }

  return <section className="panel" style={{ display: 'flex', flexDirection: 'column', minHeight: 360 }}><div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}><h3 style={{ margin: 0 }}>Chat du Live</h3><span className="muted" style={{ fontSize: 12 }}>Vous avez accès au même chat que l’organisateur.</span></div><div style={{ flex: 1, overflowY: 'auto', padding: '12px 0', display: 'grid', gap: 8, alignContent: 'start' }}>{messages.map((m) => <div key={m.id} style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--line)' }}><b style={{ fontSize: 12 }}>{m.sender_type === 'host' ? (m.sender_email || 'Organisateur') : 'Participant'}</b><div style={{ marginTop: 3 }}>{m.message}</div></div>)}{messages.length === 0 && <span className="muted">Aucun message pour le moment.</span>}</div>{error && <div className="error" style={{ marginBottom: 8 }}>{error}</div>}<form onSubmit={send} style={{ display: 'flex', gap: 8 }}><input className="form-input" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} placeholder="Écrire un message…"/><button className="primary" disabled={sending || !text.trim()}>{sending ? '…' : 'Envoyer'}</button></form></section>
}

export default function CoHostLivePage() {
  const params = useParams<{ token: string }>()
  const [started, setStarted] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const rawToken = params?.token || ''

  async function join() {
    if (!rawToken || checking) return
    setChecking(true)
    setError('')
    try {
      if (!window.isSecureContext) throw new Error('La connexion organisateur nécessite HTTPS.')
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Votre navigateur ne permet pas l’accès à la caméra et au microphone.')
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      stream.getTracks().forEach(track => track.stop())
      setStarted(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Autorisez la caméra et le microphone pour rejoindre le Live.')
    } finally {
      setChecking(false)
    }
  }

  if (!started) return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20,background:'var(--background)'}}><section className="panel" style={{maxWidth:520,width:'100%',padding:24,textAlign:'center'}}><h1 style={{marginTop:0}}>Rejoindre comme co-organisateur</h1><p className="muted">Vous allez rejoindre le même studio que l’organisateur principal. Votre caméra, votre microphone et le chat seront disponibles pendant le Live.</p>{error&&<div className="error" style={{margin:'14px 0'}}>{error}</div>}<button className="primary" style={{minHeight:46,width:'100%'}} disabled={!rawToken||checking} onClick={()=>void join()}>{checking?'Vérification de la caméra…':'Autoriser et rejoindre le Live'}</button></section></main>

  return <main style={{minHeight:'100vh',padding:16,background:'var(--background)'}}><div style={{maxWidth:1200,margin:'0 auto'}}><div style={{marginBottom:12}}><div style={{fontWeight:900}}>Studio co-organisateur</div><div className="muted" style={{fontSize:12}}>Vous êtes connecté au même Live que l’organisateur principal.</div></div><div style={{display:'grid',gridTemplateColumns:'minmax(0,2fr) minmax(300px,1fr)',gap:16,alignItems:'start'}}><MultiLiveRoom host label="Co-organisateur" tokenUrl="/api/lives/cohost-token" tokenBody={{token:rawToken}} /><CohostChat token={rawToken} /></div></div></main>
}
