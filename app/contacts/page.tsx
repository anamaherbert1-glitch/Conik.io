'use client'

import Link from 'next/link'
import { ArrowLeft, Download, Search, Upload, UserPlus, Users, X } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { ContactActionsMenu } from '@/components/contact-actions-menu'
import { CONIK_COUNTRIES, ConikCountryPicker } from '@/components/conik-country-picker'

type Contact={id:string;email:string|null;phone:string|null;first_name:string|null;last_name:string|null;status:string|null;consent_marketing:boolean;source:string|null}

export default function ContactsPage(){
  const[contacts,setContacts]=useState<Contact[]>([]),[query,setQuery]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[show,setShow]=useState(false),[saving,setSaving]=useState(false),[importing,setImporting]=useState(false),[country,setCountry]=useState<typeof CONIK_COUNTRIES[number]>(CONIK_COUNTRIES[0])
  const fileRef=useRef<HTMLInputElement>(null)
  async function load(){setLoading(true);setError('');const r=await fetch('/api/contacts');const j=await r.json().catch(()=>({}));if(!r.ok)setError(j.error||'Impossible de charger les contacts');else setContacts(j.contacts||[]);setLoading(false)}
  useEffect(()=>{load()},[])
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return contacts;return contacts.filter(c=>[c.first_name,c.last_name,c.email,c.phone,c.source].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)))},[contacts,query])
  async function importCsv(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(!file)return;setImporting(true);setError('');setNotice('');const fd=new FormData();fd.append('file',file);const r=await fetch('/api/contacts/csv',{method:'POST',body:fd});const j=await r.json().catch(()=>({}));if(!r.ok)setError(j.error||'Impossible d\u2019importer le fichier');else{setNotice(`${j.imported||0} contact${j.imported===1?'':'s'} import\u00e9${j.imported===1?'':'s'}${j.format?` (${String(j.format).toUpperCase()})`:''}. ${j.skipped||0} ignor\u00e9${j.skipped===1?'':'s'}.`);await load()}e.target.value='';setImporting(false)}
  function exportCsv(){window.location.assign('/api/contacts/csv')}
  async function add(e:FormEvent<HTMLFormElement>){e.preventDefault();setSaving(true);setError('');setNotice('');const fd=new FormData(e.currentTarget);const phoneRaw=String(fd.get('phone')||'').trim();const phone=phoneRaw?(phoneRaw.startsWith('+')?phoneRaw:`${country[2]}${phoneRaw.replace(/^0+/,'')}`):'';const body={first_name:String(fd.get('first_name')||'').trim()||null,last_name:String(fd.get('last_name')||'').trim()||null,email:String(fd.get('email')||'').trim()||null,phone:phone||null,consent_marketing:fd.get('consent')==='on'};const r=await fetch('/api/contacts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)setError(j.error||'Impossible d\u2019ajouter le contact');else{setNotice('Contact ajout\u00e9.');setShow(false);await load()}setSaving(false)}
  return (
  <div className="page">
    <div style={{marginTop:16,display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><div style={{position:'relative',flex:1,minWidth:220}}><Search size={16} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',opacity:.5}}/><input className="form-input" style={{paddingLeft:36}} placeholder="Rechercher un contact\u2026" value={query} onChange={e=>setQuery(e.target.value)}/></div></div>
    {error&&<div className="error" style={{marginTop:12}}>{error}</div>}
    {notice&&<div className="notice" style={{marginTop:12}}>{notice}</div>}
    {show&&<div className="choice" style={{marginTop:18}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><h2>Nouveau contact</h2><button type="button" className="outline" onClick={()=>setShow(false)} aria-label="Fermer"><X size={16}/></button></div><form onSubmit={add}><div className="form-grid"><input className="form-input" name="first_name" placeholder="Pr\u00e9nom"/><input className="form-input" name="last_name" placeholder="Nom"/><input className="form-input" name="email" type="email" placeholder="E-mail"/><div style={{display:'flex',gap:8,alignItems:'stretch',minWidth:0}}><ConikCountryPicker value={country[2]} onChange={setCountry}/><input className="form-input" name="phone" inputMode="tel" placeholder="Num\u00e9ro de t\u00e9l\u00e9phone" style={{minWidth:0,flex:1}}/></div></div><p className="muted" style={{fontSize:13}}>L\u2019e-mail ou le t\u00e9l\u00e9phone est obligatoire. Le pays s\u00e9lectionn\u00e9 est appliqu\u00e9 automatiquement \u00e0 l\u2019indicatif du t\u00e9l\u00e9phone.</p><label><input name="consent" type="checkbox"/> Consentement marketing</label><div style={{display:'flex',gap:8,marginTop:14}}><button className="primary" disabled={saving}>{saving?'Enregistrement\u2026':'Enregistrer le contact'}</button><button type="button" className="outline" onClick={()=>setShow(false)}>Annuler</button></div></form></div>}
  </div>
)
}
