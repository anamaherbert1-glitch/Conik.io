'use client'

import Link from 'next/link'
import { ArrowLeft, Copy, Radio, Trash2, Users, Square, MessageCircle, CircleCheck, Clock3, Send, Smartphone, Link2, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import LiveRoom from '@/components/live/live-room'
import LiveChat from '@/components/live/live-chat'

type Participant={id:string;contact_id:string;email:string;status:string;invited_at:string}
type Attendee={participant_id:string;contact_id:string;display_name:string;email:string;status:string;joined_at:string|null;last_seen_at:string|null;connected:boolean}
type Live={id:string;title:string;description:string|null;slug:string;scheduled_at:string;timezone:string;status:string;stream_provider:string|null;stream_id:string|null}

export default function LiveDetail({params}:{params:Promise<{id:string}>}){
  const[live,setLive]=useState<Live|null>(null),[participants,setParticipants]=useState<Participant[]>([]),[attendees,setAttendees]=useState<Attendee[]>([]),[contacts,setContacts]=useState<any[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[studio,setStudio]=useState(false),[ending,setEnding]=useState(false),[waMessage,setWaMessage]=useState(''),[waEligible,setWaEligible]=useState(0),[waInvited,setWaInvited]=useState(0),[waSaving,setWaSaving]=useState(false)
  async function load(id:string){const [l,p,c,a,w]=await Promise.all([fetch('/api/lives').then(r=>r.json()),fetch(`/api/lives/${id}/participants`).then(r=>r.json()),fetch('/api/contacts').then(r=>r.json()),fetch(`/api/lives/presence?live_id=${id}`,{cache:'no-store'}).then(r=>r.json()).catch(()=>({})),fetch(`/api/lives/${id}/whatsapp`,{cache:'no-store'}).then(r=>r.json()).catch(()=>({}))]);setLive((l.lives||[]).find((x:Live)=>x.id===id)||null);setParticipants(p.participants||[]);setContacts(c.contacts||[]);setAttendees(a.attendees||[]);setWaMessage(w.draft||'');setWaEligible(w.whatsapp_eligible||0);setWaInvited(w.total_invited||0)}
  useEffect(()=>{params.then(({id})=>{load(id).catch(()=>setError('Impossible de charger cet événement'));const timer=window.setInterval(()=>{void fetch(`/api/lives/presence?live_id=${id}`,{cache:'no-store'}).then(r=>r.json()).then(j=>setAttendees(j.attendees||[])).catch(()=>{})},5000);return()=>window.clearInterval(timer)})},[params])
  async function add(){if(!live||!selected)return;setError('');const r=await fetch(`/api/lives/${live.id}/participants`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contact_ids:[selected]})});const j=await r.json().catch(()=>({}));if(!r.ok)setError(j.error||'Impossible d’ajouter le contact');else{setSelected('');setNotice('Contact autorisé.');await load(live.id)}}
  async function remove(contactId:string){if(!live)return;const r=await fetch(`/api/lives/${live.id}/participants`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({contact_id:contactId})});const j=await r.json().catch(()=>({}));if(!r.ok)setError(j.error||'Impossible de retirer le contact');else{setNotice('Contact retiré.');await load(live.id)}}
  function copy(){if(!live)return;navigator.clipboard?.writeText(`${window.location.origin}/live/${live.slug}`);setNotice('Lien copié.')}
  async function startStudio(){if(!live)return;setError('');const r=await fetch(`/api/lives/${live.id}/token`,{method:'POST'});const j=await r.json().catch(()=>({}));if(!r.ok){setError(j.error||'Impossible de démarrer le studio');return}setLive(v=>v?{...v,stream_provider:'livekit',stream_id:j.room,status:'live'}:v);setStudio(true);setNotice('Studio prêt.')}
  async function endLive(){if(!live||ending)return;if(!window.confirm('Terminer définitivement ce Live ?'))return;setEnding(true);setError('');const r=await fetch(`/api/lives/${live.id}/end`,{method:'POST'});const j=await r.json().catch(()=>({}));if(!r.ok){setError(j.error||'Impossible de terminer le Live.');setEnding(false);return}setLive(v=>v?{...v,status:'ended'}:v);setStudio(false);setNotice('Live terminé.');setEnding(false)}
  async function saveWhatsApp(){if(!live||!waMessage.trim())return;setWaSaving(true);setError('');const r=await fetch(`/api/lives/${live.id}/whatsapp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:waMessage})});const j=await r.json().catch(()=>({}));if(!r.ok)setError(j.error||'Impossible d’enregistrer le message WhatsApp.');else setNotice('Message WhatsApp enregistré.');setWaSaving(false)}
  const allowed=new Set(participants.map(p=>p.contact_id)),connected=attendees.filter(a=>a.connected),notConnected=participants.filter(p=>!connected.some(a=>a.participant_id===p.id))
  return <AppShell active="Live Events"><div className="page" style={{maxWidth:1180}}>
    <Link href="/lives" className="back"><ArrowLeft size={16}/>Live Events</Link>
    {error&&<div className="error" style={{marginBottom:16}}>{error}</div>}
    {notice&&<div className="notice" style={{marginBottom:16}}>{notice}</div>}
    {!live?<div className="emptybox big">Chargement…</div>:<>
      <header className="head" style={{marginBottom:22,alignItems:'flex-start'}}>
        <div><div style={{display:'inline-flex',alignItems:'center',gap:7,fontSize:11,fontWeight:700,letterSpacing:'.08em',opacity:.65,marginBottom:7}}><Radio size={14}/>LIVE PRIVÉ</div><h1 style={{marginBottom:6}}>{live.title}</h1>{live.description&&<p className="muted" style={{margin:0,maxWidth:650}}>{live.description}</p>}</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>{live.status!=='ended'&&<><button className="primary" onClick={startStudio} disabled={studio}><Radio size={15}/>{studio?'Studio ouvert':'Démarrer le studio'}</button><button className="outline" onClick={endLive} disabled={ending}><Square size={15}/>{ending?'Arrêt…':'Couper le Live'}</button></>}<button className="outline" onClick={copy}><Copy size={15}/>Copier le lien</button></div>
      </header>
      {studio&&live.status!=='ended'&&<section className="panel" style={{marginBottom:18}}><div style={{display:'flex',alignItems:'center',gap:9,marginBottom:14}}><Radio size={18}/><h3 style={{margin:0}}>Studio</h3></div><LiveRoom tokenUrl={`/api/lives/${live.id}/token`} tokenBody={{}} host/></section>}
      {live.status!=='ended'&&<section style={{marginBottom:18}}><LiveChat liveId={live.id} host/></section>}
      <section className="panel" style={{marginTop:18}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:14}}><div style={{display:'flex',alignItems:'center',gap:9}}><Users size={18}/><h3 style={{margin:0}}>Participants</h3></div><span className="muted" style={{fontSize:12}}>{participants.length} invités</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))',gap:12}}>
          <div className="choice" style={{padding:16}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><CircleCheck size={17}/><b>Connectés</b><span className="muted">{connected.length}</span></div>{connected.length===0?<p className="muted" style={{margin:0,fontSize:13}}>Aucun participant connecté.</p>:connected.map(a=><div key={a.participant_id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid var(--line)'}}><UserRound size={16}/><div><b style={{fontSize:13}}>{a.display_name||a.email}</b><small className="muted" style={{display:'block'}}>{a.email}</small></div></div>)}</div>
          <div className="choice" style={{padding:16}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}><Clock3 size={17}/><b>En attente</b><span className="muted">{notConnected.length}</span></div>{notConnected.length===0?<p className="muted" style={{margin:0,fontSize:13}}>Tous les invités sont connectés.</p>:notConnected.map(p=><div key={p.id} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid var(--line)'}}><UserRound size={16}/><div><b style={{fontSize:13}}>{contacts.find(c=>c.id===p.contact_id)?[contacts.find(c=>c.id===p.contact_id)?.first_name,contacts.find(c=>c.id===p.contact_id)?.last_name].filter(Boolean).join(' '):p.email}</b><small className="muted" style={{display:'block'}}>{p.email}</small></div></div>)}</div>
        </div>
      </section>
      <section className="panel" style={{marginTop:18}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:5}}><div style={{display:'flex',alignItems:'center',gap:9}}><Smartphone size={18}/><h3 style={{margin:0}}>WhatsApp</h3></div><span className="muted" style={{fontSize:12}}>{waEligible}/{waInvited} éligibles</span></div>
        <p className="muted" style={{fontSize:13,margin:'0 0 12px'}}>Préparez le message d’invitation. Le lien de ce Live sera utilisé automatiquement.</p>
        <textarea className="form-input" rows={4} value={waMessage} onChange={e=>setWaMessage(e.target.value)} placeholder="Message d’invitation…"/>
        <div style={{display:'flex',gap:9,alignItems:'center',flexWrap:'wrap',marginTop:10}}><button className="primary" onClick={saveWhatsApp} disabled={waSaving||!waMessage.trim()}><Send size={15}/>{waSaving?'Enregistrement…':'Enregistrer'}</button><span className="muted" style={{fontSize:12}}>L’envoi sera activé après connexion WhatsApp.</span></div>
      </section>
      <section className="panel" style={{marginTop:18}}>
        <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:8}}><Link2 size={18}/><h3 style={{margin:0}}>Lien du Live</h3></div>
        <div className="choice" style={{fontSize:13,wordBreak:'break-all'}}>{window.location.origin}/live/{live.slug}</div>
      </section>
      <section className="panel" style={{marginTop:18}}>
        <div style={{display:'flex',alignItems:'center',gap:9}}><Users size={18}/><h3 style={{margin:0}}>Contacts autorisés</h3><span className="muted" style={{fontSize:12}}>{participants.length}</span></div>
        <div style={{display:'flex',gap:8,marginTop:14,flexWrap:'wrap'}}><select className="form-input" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Ajouter un contact</option>{contacts.filter(c=>c.email&&!allowed.has(c.id)).map(c=><option key={c.id} value={c.id}>{[c.first_name,c.last_name].filter(Boolean).join(' ')||c.email} — {c.email}</option>)}</select><button className="primary" onClick={add} disabled={!selected}>Autoriser</button></div>
        <div className="table-wrap" style={{marginTop:14}}><table><thead><tr><th>Contact</th><th>Statut</th><th>Invitation</th><th></th></tr></thead><tbody>{participants.map(p=><tr key={p.id}><td>{p.email}</td><td>{p.status}</td><td>{p.invited_at?new Date(p.invited_at).toLocaleString('fr-FR'):'—'}</td><td><button className="outline" onClick={()=>remove(p.contact_id)} aria-label="Retirer"><Trash2 size={15}/></button></td></tr>)}{participants.length===0&&<tr><td colSpan={4}>Aucun contact autorisé.</td></tr>}</tbody></table></div>
      </section>
    </>}
  </div></AppShell>
}
