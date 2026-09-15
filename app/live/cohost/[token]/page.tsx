'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import MultiLiveRoom from '@/components/live/multi-live-room'

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

  if (!started) {
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20,background:'var(--background)'}}>
      <section className="panel" style={{maxWidth:520,width:'100%',padding:24,textAlign:'center'}}>
        <h1 style={{marginTop:0}}>Rejoindre comme co-organisateur</h1>
        <p className="muted">Vous allez rejoindre le même studio que l’organisateur principal. Votre caméra et votre microphone pourront être visibles par les autres participants.</p>
        {error&&<div className="error" style={{margin:'14px 0'}}>{error}</div>}
        <button className="primary" style={{minHeight:46,width:'100%'}} disabled={!rawToken||checking} onClick={()=>void join()}>{checking?'Vérification de la caméra…':'Autoriser et rejoindre le Live'}</button>
        <p className="muted" style={{fontSize:11,marginTop:12}}>L’autorisation caméra/micro est demandée avant l’utilisation du lien organisateur.</p>
      </section>
    </main>
  }

  return <main style={{minHeight:'100vh',padding:16,background:'var(--background)'}}>
    <div style={{maxWidth:1200,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <div><div style={{fontWeight:900}}>Studio co-organisateur</div><div className="muted" style={{fontSize:12}}>Vous êtes connecté au même Live que l’organisateur principal.</div></div>
      </div>
      <MultiLiveRoom host label="Co-organisateur" tokenUrl="/api/lives/cohost-token" tokenBody={{token:rawToken}} />
    </div>
  </main>
}
