'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import MultiLiveRoom from '@/components/live/multi-live-room'

export default function CoHostLivePage() {
  const params = useParams<{ token: string }>()
  const [started, setStarted] = useState(false)
  const [token, setToken] = useState('')
  const rawToken = params?.token || ''

  if (!started) {
    return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:20,background:'var(--background)'}}>
      <section className="panel" style={{maxWidth:520,width:'100%',padding:24,textAlign:'center'}}>
        <h1 style={{marginTop:0}}>Rejoindre comme co-organisateur</h1>
        <p className="muted">Vous allez rejoindre le même studio que l’organisateur principal. Votre caméra et votre microphone pourront être visibles par les autres participants.</p>
        <button className="primary" style={{minHeight:46,width:'100%'}} disabled={!rawToken} onClick={()=>{setToken(rawToken);setStarted(true)}}>Rejoindre le Live</button>
      </section>
    </main>
  }

  return <main style={{minHeight:'100vh',padding:16,background:'var(--background)'}}>
    <div style={{maxWidth:1200,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <div><div style={{fontWeight:900}}>Studio co-organisateur</div><div className="muted" style={{fontSize:12}}>Vous êtes connecté au même Live que l’organisateur principal.</div></div>
      </div>
      <MultiLiveRoom host label="Co-organisateur" tokenUrl="/api/lives/cohost-token" tokenBody={{token}} />
    </div>
  </main>
}
