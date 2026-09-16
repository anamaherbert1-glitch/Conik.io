'use client'

import { useEffect, useMemo, useState } from 'react'
import { getPaymentMethodKind, getPaymentMethodLogo } from '@/lib/payment-method-logos'

type Method = { id: string; provider_id: string; provider?: string | null; method_code: string; display_name?: string | null; enabled: boolean; config?: Record<string, unknown> | null }
type CheckoutData = { funnel: { id: string; name: string; slug: string }; paymentPage: { id: string; name: string; slug: string } | null; tariff: { id: string; name: string; amount_cents: number; currency: string; product_label?: string | null }; methods: Method[] }

const money = (cents: number, currency: string) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100) } catch { return `${(cents / 100).toFixed(2)} ${currency}` } }

export function PublicPaymentCheckout({ funnelSlug, pageSlug, tariffSlug }: { funnelSlug: string; pageSlug: string; tariffSlug: string }) {
  const [data, setData] = useState<CheckoutData | null>(null), [methodCode, setMethodCode] = useState(''), [firstName, setFirstName] = useState(''), [lastName, setLastName] = useState(''), [email, setEmail] = useState(''), [phone, setPhone] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  useEffect(() => { let cancelled = false; fetch(`/api/payments/checkout?funnel=${encodeURIComponent(funnelSlug)}&page=${encodeURIComponent(pageSlug)}&tarif=${encodeURIComponent(tariffSlug)}`).then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Impossible de charger le paiement.'); return j as CheckoutData }).then(j => { if (!cancelled) { setData(j); setMethodCode(j.methods?.[0]?.method_code || '') } }).catch(e => !cancelled && setError(e instanceof Error ? e.message : 'Impossible de charger le paiement.')); return () => { cancelled = true } }, [funnelSlug, pageSlug, tariffSlug])
  const selected = useMemo(() => data?.methods.find(m => m.method_code === methodCode) || null, [data, methodCode])
  const kind = getPaymentMethodKind(selected?.method_code, selected?.display_name)
  async function pay() {
    if (!data || !selected) return setError('Sélectionnez un moyen de paiement.')
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return setError('Renseignez votre prénom, votre nom et votre e-mail.')
    if (kind === 'mobile_money' && !phone.trim()) return setError('Renseignez votre numéro de téléphone.')
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/payments/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ funnelId: data.funnel.id, tariffId: data.tariff.id, paymentPageId: data.paymentPage?.id, methodCode: selected.method_code, firstName, lastName, name: `${firstName} ${lastName}`.trim(), email, phone }) })
      const checkout = await r.json().catch(() => ({})); if (!r.ok) throw new Error(checkout.error || 'Création de la commande impossible.')
      const init = await fetch('/api/payments/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: checkout.transaction.id, methodCode: selected.method_code }) })
      const initialized = await init.json().catch(() => ({})); if (!init.ok) throw new Error(initialized.error || 'Initialisation du paiement impossible.')
      if (initialized.paymentUrl) return window.location.assign(initialized.paymentUrl)
      window.location.assign(`/payment/result?order=${encodeURIComponent(checkout.order.order_number)}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Paiement impossible.'); setBusy(false) }
  }
  if (error && !data) return <div style={s.error}>{error}</div>
  if (!data) return <div style={s.loading}>Chargement des moyens de paiement…</div>
  return <section style={s.card} aria-label="Paiement sécurisé">
    <div style={s.header}><div><div style={s.kicker}>PAIEMENT SÉCURISÉ</div><h2 style={s.title}>{data.tariff.product_label || data.tariff.name}</h2></div><strong>{money(data.tariff.amount_cents, data.tariff.currency)}</strong></div>
    <div style={s.fields}><input placeholder="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} style={s.input}/><input placeholder="Nom" value={lastName} onChange={e => setLastName(e.target.value)} style={s.input}/><input type="email" placeholder="Adresse e-mail" value={email} onChange={e => setEmail(e.target.value)} style={s.input}/><input type="tel" placeholder="Numéro de téléphone" value={phone} onChange={e => setPhone(e.target.value)} style={s.input}/></div>
    <div style={s.label}>Choisissez votre moyen de paiement</div>
    <div style={s.methods}>{data.methods.map(m => { const active = m.method_code === methodCode; const logo = getPaymentMethodLogo(m.method_code, m.config); return <button key={m.id} type="button" onClick={() => { setMethodCode(m.method_code); setError('') }} aria-pressed={active} style={{ ...s.method, ...(active ? s.active : {}) }}>{logo ? <img src={logo} alt="" style={s.logo}/> : <span style={s.fallback}>{(m.display_name || m.method_code).slice(0,2).toUpperCase()}</span>}<span>{m.display_name || m.method_code}</span></button> })}</div>
    {selected && <div style={s.panel}><strong>{selected.display_name || selected.method_code}</strong><div>{kind === 'card' ? 'Vous serez redirigé vers l’espace sécurisé du prestataire pour saisir les données de votre carte. Conik ne stocke pas les données de carte.' : kind === 'mobile_money' ? 'Votre numéro sera utilisé pour démarrer la demande de paiement mobile auprès du prestataire.' : 'Les informations nécessaires seront demandées par le prestataire.'}</div></div>}
    {error && <div style={s.inlineError}>{error}</div>}
    <button type="button" disabled={busy || !selected} onClick={pay} style={s.pay}>{busy ? 'Redirection vers le paiement…' : `Continuer avec ${selected?.display_name || 'ce moyen de paiement'}`}</button>
  </section>
}

const s: Record<string, React.CSSProperties> = {
  card:{width:'100%',boxSizing:'border-box',padding:24,borderRadius:20,background:'#fff',color:'#111827',boxShadow:'0 12px 35px rgba(0,0,0,.10)',fontFamily:'system-ui,sans-serif'}, header:{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',marginBottom:20}, kicker:{fontSize:11,fontWeight:800,letterSpacing:'.12em',opacity:.55}, title:{margin:'5px 0 0',fontSize:21}, fields:{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginBottom:20}, input:{width:'100%',boxSizing:'border-box',padding:'13px 14px',border:'1px solid #d1d5db',borderRadius:10,fontSize:14}, label:{fontWeight:700,fontSize:14,marginBottom:10}, methods:{display:'flex',gap:10,flexWrap:'wrap',overflowX:'auto',paddingBottom:4}, method:{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,minWidth:110,height:58,padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:12,background:'#fff',cursor:'pointer',whiteSpace:'nowrap'}, active:{border:'2px solid #111827',padding:'7px 11px',boxShadow:'0 4px 12px rgba(0,0,0,.08)'}, logo:{width:42,height:28,objectFit:'contain'}, fallback:{minWidth:42,height:28,display:'grid',placeItems:'center',borderRadius:6,background:'#f3f4f6',fontSize:12,fontWeight:800}, panel:{marginTop:16,padding:14,borderRadius:12,background:'#f8fafc',border:'1px solid #e5e7eb',fontSize:13,lineHeight:1.5}, inlineError:{marginTop:12,padding:10,borderRadius:8,background:'#fef2f2',color:'#991b1b',fontSize:13}, pay:{width:'100%',marginTop:18,padding:'14px 18px',border:0,borderRadius:12,background:'#111827',color:'#fff',fontWeight:800,fontSize:15,cursor:'pointer'}, loading:{padding:20,textAlign:'center'}, error:{margin:20,padding:14,borderRadius:10,background:'#fef2f2',color:'#991b1b'}
}
