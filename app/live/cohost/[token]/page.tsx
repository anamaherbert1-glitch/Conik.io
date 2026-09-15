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
        <p className="muted">Autorisez la caméra et le microphone pour apparaître dans le Live avec l’organisateur principal.</p>
        <button className="primary" style={{minHeight:46,width:'100%'}} onClick={()=>{setToken(rawToken);setStarted(true)}}>Rejoindre le Live</button>
      </section>
    </main>
  }

  return <main style={{minHeight:'100vh',padding:16,background:'var(--background)'}}>
    <div style={{maxWidth:1200,margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:12,flexWrap:'wrap'}}>
        <div><div style={{fontWeight:900}}>Studio co-organisateur</div><div className="muted" style={{fontSize:12}}>Votre caméra et votre microphone seront visibles par les autres participants.</div></div>
      </div>
      <MultiLiveRoom host tokenUrl="/api/lives/cohost-token" tokenBody={{token}} />
    </div>
  </main>
}
