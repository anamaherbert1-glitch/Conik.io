'use client'

import Link from 'next/link'
import { CalendarDays, Clock3, ExternalLink, Plus, Radio } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { LiveDeleteButton } from '@/components/live/live-delete-button'

type LiveEvent = { id:string; title:string; description:string|null; slug:string; scheduled_at:string; timezone:string; status:string; access_type:string; stream_provider:string|null; stream_id:string|null }

const statusLabel:Record<string,string>={draft:'Brouillon',scheduled:'Programmé',live:'En direct',ended:'Terminé',cancelled:'Annulé'}

export default function LivesPage(){
  const[lives,setLives]=useState<LiveEvent[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  async function load(){setLoading(true);setError('');const r=await fetch('/api/lives');const j=await r.json().catch(()=>({}));if(!r.ok)setError(j.error||'Impossible de charger les lives');else setLives(j.lives||[]);setLoading(false)}
  useEffect(()=>{load()},[])
  return <AppShell active="Live Events"><div className="page"><div className="head"><div><small>ÉVÉNEMENTS</small><h1>Live Events</h1><p>Créez des lives privés et contrôlez précisément qui peut y accéder.</p></div><Link className="primary" href="/lives/new"><Plus size={16}/>Créer un Live</Link></div>{error&&<div className="error" style={{marginTop:16}}>{error}</div>}{loading?<div className="emptybox big">Chargement des lives…</div>:lives.length===0?<div className="emptybox big"><Radio size={30}/><b>Aucun Live créé</b><p>Créez votre premier événement privé et sélectionnez les contacts autorisés.</p><Link className="primary" href="/lives/new"><Plus size={16}/>Créer un Live</Link></div>:<div className="grid" style={{marginTop:24}}>{lives.map(l=><article className="panel" key={l.id}><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start'}}><div><span className="live">● {statusLabel[l.status]||l.status}</span><h3 style={{marginTop:10}}>{l.title}</h3><p className="muted">{l.description||'Aucune description.'}</p></div><Radio size={22}/></div><div style={{display:'grid',gap:8,marginTop:16,fontSize:13}}><span><CalendarDays size={15} style={{verticalAlign:'middle',marginRight:6}}/>{new Date(l.scheduled_at).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'})}</span><span><Clock3 size={15} style={{verticalAlign:'middle',marginRight:6}}/>{l.timezone}</span></div><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:18}}><Link className="outline" href={`/lives/${l.id}`}>Gérer les accès</Link><a className="outline" href={`/live/${l.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={15}/>Ouvrir le lien</a>{l.status==='ended'&&<LiveDeleteButton liveId={l.id} title={l.title} onDeleted={()=>void load()}/>}</div></article>)}</div>}</div></AppShell>
}
