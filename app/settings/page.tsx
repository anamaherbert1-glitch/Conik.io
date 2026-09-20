'use client'

import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { SettingsCollaboration } from '@/components/settings-collaboration'
import { SettingsTutorial } from '@/components/settings-tutorial'
import { usePreferences } from '@/components/preferences-provider'
import { locales, type Locale, type Theme } from '@/lib/i18n/dictionaries'
import { Moon, Sun, Monitor, MessageSquarePlus, User, Building2, Camera, ChevronDown } from 'lucide-react'

type Country = { name: string; code: string; dial: string; flag: string }

const countries: Country[] = [
  { name: 'Togo', code: 'TG', dial: '+228', flag: '🇹🇬' },
  { name: 'Bénin', code: 'BJ', dial: '+229', flag: '🇧🇯' },
  { name: 'Ghana', code: 'GH', dial: '+233', flag: '🇬🇭' },
  { name: "Côte d’Ivoire", code: 'CI', dial: '+225', flag: '🇨🇮' },
  { name: 'Sénégal', code: 'SN', dial: '+221', flag: '🇸🇳' },
  { name: 'Burkina Faso', code: 'BF', dial: '+226', flag: '🇧🇫' },
  { name: 'Mali', code: 'ML', dial: '+223', flag: '🇲🇱' },
  { name: 'Niger', code: 'NE', dial: '+227', flag: '🇳🇪' },
  { name: 'Guinée', code: 'GN', dial: '+224', flag: '🇬🇳' },
  { name: 'Cameroun', code: 'CM', dial: '+237', flag: '🇨🇲' },
  { name: 'Gabon', code: 'GA', dial: '+241', flag: '🇬🇦' },
  { name: 'Congo', code: 'CG', dial: '+242', flag: '🇨🇬' },
  { name: 'RD Congo', code: 'CD', dial: '+243', flag: '🇨🇩' },
  { name: 'Nigeria', code: 'NG', dial: '+234', flag: '🇳🇬' },
  { name: 'Kenya', code: 'KE', dial: '+254', flag: '🇰🇪' },
  { name: 'Maroc', code: 'MA', dial: '+212', flag: '🇲🇦' },
  { name: 'Algérie', code: 'DZ', dial: '+213', flag: '🇩🇿' },
  { name: 'Tunisie', code: 'TN', dial: '+216', flag: '🇹🇳' },
  { name: 'France', code: 'FR', dial: '+33', flag: '🇫🇷' },
  { name: 'Belgique', code: 'BE', dial: '+32', flag: '🇧🇪' },
  { name: 'Canada', code: 'CA', dial: '+1', flag: '🇨🇦' },
  { name: 'États-Unis', code: 'US', dial: '+1', flag: '🇺🇸' },
  { name: 'Royaume-Uni', code: 'GB', dial: '+44', flag: '🇬🇧' },
]

type Profile = {
  email: string; fullName: string; phone: string; country: string; countryCode: string
  city: string; company: string; avatarUrl: string; orgName: string
}

export default function SettingsPage() {
  const { dict, locale, theme, setLocale, setTheme } = usePreferences()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [msg, setMsg] = useState(''); const [isError, setIsError] = useState(false); const [busy, setBusy] = useState(false)
  const [countryOpen, setCountryOpen] = useState(false); const [countrySearch, setCountrySearch] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [fbSubject, setFbSubject] = useState(''); const [fbMessage, setFbMessage] = useState('')
  const [fbCategory, setFbCategory] = useState<'bug'|'idea'|'question'|'other'>('bug'); const [fbBusy, setFbBusy] = useState(false); const [fbMsg, setFbMsg] = useState('')

  useEffect(() => { void loadProfile() }, [])

  async function loadProfile() {
    const r = await fetch('/api/profile'); if (!r.ok) return; const j = await r.json()
    setProfile({ email:j.email||'', fullName:j.fullName||'', phone:j.phone||'', country:j.country||'', countryCode:j.countryCode||'',
      city:j.city||'', company:j.company||'', avatarUrl:j.avatarUrl||'', orgName:j.orgName||'' })
  }

  function chooseCountry(c: Country) {
    if (!profile) return
    let local = profile.phone.replace(/^\s+/, '')
    const old = countries.find(x => x.code === profile.countryCode)
    if (old) local = local.replace(new RegExp('^\\'+old.dial+'\\s*'), '')
    local = local.replace(/^\+\d{1,4}\s*/, '')
    setProfile({...profile, country:c.name, countryCode:c.code, phone: local ? c.dial+' '+local : c.dial+' '})
    setCountryOpen(false); setCountrySearch('')
  }

  function phoneChanged(value: string) {
    if (!profile) return
    const c = countries.find(x=>x.code===profile.countryCode)
    const prefix = c?.dial || ''
    let local = value
    if (prefix && !local.startsWith(prefix)) local = prefix + ' ' + local.replace(/^\+\d{1,4}\s*/, '')
    setProfile({...profile, phone:local})
  }

  async function uploadAvatar(file: File) {
    if (!profile) return
    if (!file.type.startsWith('image/')) { setMsg('Veuillez sélectionner une image.'); setIsError(true); return }
    if (file.size > 5 * 1024 * 1024) { setMsg('La photo doit faire au maximum 5 Mo.'); setIsError(true); return }
    setAvatarBusy(true); setMsg('')
    const fd=new FormData(); fd.append('file',file)
    const r=await fetch('/api/profile/avatar',{method:'POST',body:fd}); const j=await r.json().catch(()=>({}))
    if(!r.ok){setMsg(j.error||'Import de la photo impossible.');setIsError(true)}
    else {setProfile({...profile,avatarUrl:j.avatarUrl||''});setMsg('Photo de profil mise à jour.');setIsError(false)}
    setAvatarBusy(false)
  }

  async function saveProfile() {
    if (!profile) return
    setBusy(true); setMsg(''); setIsError(false)
    const r = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setMsg(j.error || 'Erreur enregistrement'); setIsError(true) }
    else { setMsg('Profil enregistré'); setIsError(false) }
    setBusy(false)
  }

  async function sendFeedback() {
    setFbBusy(true); setFbMsg('')
    const r = await fetch('/api/support/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: fbSubject, message: fbMessage, category: fbCategory }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setFbMsg(j.error || 'Envoi impossible')
    else { setFbMsg(j.message || 'Message envoyé'); setFbSubject(''); setFbMessage('') }
    setFbBusy(false)
  }

  const selectedCountry=countries.find(c=>c.code===profile?.countryCode)
  const filteredCountries=countries.filter(c=>(c.name+' '+c.dial).toLowerCase().includes(countrySearch.toLowerCase()))

  return <AppShell active="Settings">
    <header><div><small>SETTINGS</small><h1>{dict.settings.title}</h1><p className="muted">Mon profil, collaboration, tutoriel et support.</p></div></header>

    <section className="panel settings-section">
      <h3 style={{marginTop:0}}>Apparence</h3>
      <div className="settings-choice-row">{([['system',Monitor,'Système'],['light',Sun,'Clair'],['dark',Moon,'Sombre']] as const).map(([t,Icon,label])=><button key={t} type="button" className={theme===t?'primary':'outline'} onClick={()=>setTheme(t as Theme)}><Icon size={15}/>{label}</button>)}</div>
      <div className="settings-choice-row">{locales.map(l=><button key={l.code} type="button" className={locale===l.code?'primary':'outline'} onClick={()=>setLocale(l.code as Locale)}>{l.native}</button>)}</div>
    </section>

    <section className="panel settings-section">
      <div className="section-head"><div style={{display:'flex',alignItems:'center',gap:8}}><User size={18}/><h3 style={{margin:0}}>Mon profil</h3></div></div>
      {profile && <div className="form-grid">
        <div className="profile-photo-row">
          <div className="profile-avatar-large">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="Photo de profil"/> : <User size={30} opacity={.45}/>}</div>
          <div className="profile-photo-actions">
            <div><b>Photo de profil</b><p className="muted">Importez une image directement depuis votre téléphone.</p></div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void uploadAvatar(f);e.currentTarget.value=''}}/>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void uploadAvatar(f);e.currentTarget.value=''}}/>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button type="button" className="primary" disabled={avatarBusy} onClick={()=>fileRef.current?.click()}><Camera size={15}/>{avatarBusy?'Import…':'Choisir une photo'}</button>
              <button type="button" className="outline" disabled={avatarBusy} onClick={()=>cameraRef.current?.click()}>Prendre une photo</button>
            </div>
          </div>
        </div>
        <label className="form-label">Nom complet<input className="form-input" value={profile.fullName} onChange={e=>setProfile({...profile,fullName:e.target.value})}/></label>
        <label className="form-label">E-mail<input className="form-input" value={profile.email} disabled/></label>
        <div className="form-label">Pays
          <button type="button" className="country-trigger" onClick={()=>setCountryOpen(true)}>
            <span>{selectedCountry?.flag||'🌍'} {profile.country||'Choisir un pays'}</span><ChevronDown size={16}/>
          </button>
        </div>
        <label className="form-label">Téléphone
          <div className="phone-field"><span className="phone-prefix">{selectedCountry?.dial||'+'}</span><input className="form-input phone-input" value={profile.phone.replace(selectedCountry?.dial||'','').trimStart()} onChange={e=>phoneChanged((selectedCountry?.dial||'')+' '+e.target.value)} placeholder="90 00 00 00"/></div>
        </label>
        <label className="form-label">Ville<input className="form-input" value={profile.city} onChange={e=>setProfile({...profile,city:e.target.value})}/></label>
        <label className="form-label">Entreprise<input className="form-input" value={profile.company} onChange={e=>setProfile({...profile,company:e.target.value})}/></label>
        <label className="form-label"><span style={{display:'inline-flex',alignItems:'center',gap:6}}><Building2 size={14}/> Nom de l’espace de travail</span><input className="form-input" value={profile.orgName} onChange={e=>setProfile({...profile,orgName:e.target.value})}/></label>
      </div>}
      <div className="button-row" style={{marginTop:12}}><button className="primary" onClick={()=>void saveProfile()} disabled={busy||!profile}>{busy?'Enregistrement…':'Enregistrer le profil'}</button></div>
      {msg&&<div className={isError?'error':'notice'} style={{marginTop:10}}>{msg}</div>}
    </section>

    {countryOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setCountryOpen(false)}}><div className="country-modal" role="dialog" aria-modal="true">
      <div className="country-modal-head"><div><b>Choisir un pays</b><span className="muted">L’indicatif sera ajouté automatiquement au téléphone.</span></div><button className="icon-button" onClick={()=>setCountryOpen(false)}>×</button></div>
      <input autoFocus className="form-input" placeholder="Rechercher un pays ou un indicatif…" value={countrySearch} onChange={e=>setCountrySearch(e.target.value)}/>
      <div className="country-list">{filteredCountries.map(c=><button key={c.code} className="country-option" onClick={()=>chooseCountry(c)}><span className="country-flag">{c.flag}</span><span className="country-name">{c.name}</span><span className="country-dial">{c.dial}</span></button>)}</div>
    </div></div>}

    <SettingsCollaboration />

    <SettingsTutorial />

    <section className="panel settings-section">
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}><MessageSquarePlus size={18}/><h3 style={{margin:0}}>Support & feedback</h3></div>
      <p className="muted" style={{marginTop:0,fontSize:13}}>Un bug ou une remarque ? Envoyez un message à l’équipe Conik.</p>
      <div className="form-grid">
        <label className="form-label">Type<select className="form-input" value={fbCategory} onChange={e=>setFbCategory(e.target.value as typeof fbCategory)}><option value="bug">Bug</option><option value="idea">Idée</option><option value="question">Question</option><option value="other">Autre</option></select></label>
        <label className="form-label">Sujet<input className="form-input" value={fbSubject} onChange={e=>setFbSubject(e.target.value)}/></label>
        <label className="form-label" style={{gridColumn:'1 / -1'}}>Message<textarea className="form-input" rows={4} value={fbMessage} onChange={e=>setFbMessage(e.target.value)} style={{resize:'vertical'}}/></label>
      </div>
      <div className="button-row" style={{marginTop:12}}><button className="primary" type="button" disabled={fbBusy||fbSubject.trim().length<3||fbMessage.trim().length<10} onClick={()=>void sendFeedback()}>{fbBusy?'Envoi…':'Envoyer au support'}</button></div>
      {fbMsg&&<div className="notice" style={{marginTop:10}}>{fbMsg}</div>}
    </section>
  </AppShell>
}
