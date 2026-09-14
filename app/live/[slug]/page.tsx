'use client'

import { LockKeyhole, Radio, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import LiveRoom from '@/components/live/live-room'
import LiveChat from '@/components/live/live-chat'

type Live={id:string;title:string;description:string|null;scheduled_at:string;timezone:string;status:string;stream_provider:string|null;stream_id:string|null}

export default function PublicLive({params}:{params:Promise<{slug:string}>}){
  const[live,setLive]=useState<Live|null>(null),[slug,setSlug]=useState(''),[email,setEmail]=useState(''),[loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false),[error,setError]=useState('')
  useEffect(()=>{params.then(({slug})=>{setSlug(slug);fetch(`/api/lives/access?slug=${encodeURIComponent(slug)}`).then(async r=>{const j=await r.json().catch(()=>({}));if(r.ok&&j.authorized)setLive(j.live);setLoading(false)}).catch(()=>setLoading(false))})},[params])
  async function requestAccess(e:React.FormEvent){e.preventDefault();setSubmitting(true);setError('');const r=await fetch('/api/lives/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,email})});const j=await r.json().catch(()=>({}));if(!r.ok){setError(j.error||'Accès refusé.');setSubmitting(false);return}setLive(j.live);setSubmitting(false)}
  if(loading)return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}><p>Vérification de votre accès…</p></main>
  if(!live)return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24}}><div className="choice" style={{maxWidth:520,width:'100%'}}><div style={{textAlign:'center'}}><LockKeyhole size={34}/><h1>Live privé</h1><p>Entrez l’adresse e-mail qui a été autorisée par l’organisateur.</p></div>{error&&<div className="error" style={{marginTop:16}}>{error}</div>}<form onSubmit={requestAccess} style={{marginTop:18}}><input className="form-input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Votre adresse e-mail"/><button className="primary" style={{width:'100%',marginTop:10}} disabled={submitting}>{submitting?'Vérification…':'Accéder au Live'}</button></form><p className="muted" style={{fontSize:12,marginTop:14,textAlign:'center'}}>Votre accès est vérifié côté serveur avant l’ouverture du Live.</p></div></main>
  const ended=live.status==='ended'
  return <main style={{minHeight:'100vh',padding:24,maxWidth:1200,margin:'0 auto'}}><header style={{padding:'28px 0'}}><span className="live"><Radio size={14}/> {ended?'LIVE TERMINÉ':live.status==='live'?'EN DIRECT':'ÉVÉNEMENT PRIVÉ'}</span><h1 style={{marginTop:10}}>{live.title}</h1>{live.description&&<p className="muted">{live.description}</p>}<p className="muted">{new Date(live.scheduled_at).toLocaleString('fr-FR',{dateStyle:'full',timeStyle:'short'})} · {live.timezone}</p></header>{ended?<section className="panel" style={{minHeight:300,display:'grid',placeItems:'center',textAlign:'center'}}><div><ShieldCheck size={42}/><h2>Ce Live est terminé</h2><p className="muted">Merci d’avoir participé.</p></div></section>:<div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(300px,380px)',gap:20,alignItems:'start'}}><LiveRoom tokenUrl="/api/lives/token" tokenBody={{slug}}/><LiveChat slug={slug}/></div>}<p className="muted" style={{fontSize:12,textAlign:'center',marginTop:18}}>Accès sécurisé par Conik.io</p></main>
}
