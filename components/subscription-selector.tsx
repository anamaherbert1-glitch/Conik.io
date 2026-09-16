'use client'

import { useMemo, useState } from 'react'

type Props = { basicPrice:number; premiumPrice:number; whatsappDailyBasic:number; whatsappDailyPremium:number; whatsappEndsAt?:string|null }

export function SubscriptionSelector({ basicPrice,premiumPrice,whatsappDailyBasic,whatsappDailyPremium,whatsappEndsAt }:Props) {
  const [plan,setPlan] = useState<'basic'|'premium'>('basic')
  const [days,setDays] = useState(1)
  const daily = plan === 'basic' ? whatsappDailyBasic : whatsappDailyPremium
  const whatsappTotal = useMemo(() => daily * days,[daily,days])
  return <section className="panel" style={{display:'grid',gap:18}}>
    <div><small>ABONNEMENTS</small><h2 style={{margin:'6px 0'}}>Conik + WhatsApp</h2><p className="muted">L’abonnement Conik dure toujours 30 jours. WhatsApp GREEN-API est une option indépendante de 1 à 31 jours.</p></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>
      {(['basic','premium'] as const).map(p => <button key={p} type="button" className={plan===p?'button primary':'button'} onClick={()=>setPlan(p)} style={{textAlign:'left',padding:16}}><b>{p==='basic'?'Basic':'Premium'}</b><div className="muted">Conik · 30 jours · {(p==='basic'?basicPrice:premiumPrice).toLocaleString('fr-FR')} XOF</div></button>)}
    </div>
    <div className="panel" style={{display:'grid',gap:10}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12}}><b>WhatsApp GREEN-API</b><strong>{days} jour{days>1?'s':''}</strong></div>
      <input aria-label="Durée WhatsApp en jours" type="range" min={1} max={31} value={days} onChange={e=>setDays(Number(e.target.value))}/>
      <div style={{display:'flex',justifyContent:'space-between'}}><span className="muted">1 jour</span><span className="muted">31 jours</span></div>
      <div className="muted">Tarif configuré : {daily.toLocaleString('fr-FR')} XOF/jour · Total : {whatsappTotal.toLocaleString('fr-FR')} XOF</div>
      {whatsappEndsAt && <div className="notice">WhatsApp actif jusqu’au {new Date(whatsappEndsAt).toLocaleDateString('fr-FR')}. Un renouvellement avant expiration ajoute les jours à la date actuelle.</div>}
    </div>
    <div className="muted">Le bouton de paiement doit être relié au moyen de paiement de Conik. L’activation n’est autorisée qu’après confirmation du paiement côté serveur.</div>
  </section>
}
