'use client'

import { useEffect, useMemo, useState } from 'react'
import { getPaymentMethodKind, getPaymentMethodLogo } from '@/lib/payment-method-logos'

type Method = { id: string; provider_id: string; provider?: string | null; method_code: string; display_name?: string | null; enabled: boolean; config?: Record<string, unknown> | null }
type CheckoutData = { funnel: { id: string; name: string; slug: string }; paymentPage: { id: string; name: string; slug: string } | null; tariff: { id: string; name: string; amount_cents: number; currency: string; product_label?: string | null }; methods: Method[] }

const money = (cents: number, currency: string) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100) } catch { return `${(cents / 100).toFixed(2)} ${currency}` } }

export function PublicPaymentCheckout({ funnelSlug, pageSlug, tariffSlug }: { funnelSlug: string; pageSlug: string; tariffSlug: string }) {
  const [data, setData] = useState<CheckoutData | null>(null)
  const [methodCode, setMethodCode] = useState('')
  const [firstName, setFirstName] = useState(''), [lastName, setLastName] = useState(''), [email, setEmail] = useState(''), [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/payments/checkout?funnel=${encodeURIComponent(funnelSlug)}&page=${encodeURIComponent(pageSlug)}&tarif=${encodeURIComponent(tariffSlug)}`)
      .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Impossible de charger le paiement.'); return j as CheckoutData })
      .then(j => { if (!cancelled) { setData(j); setMethodCode(j.methods?.find(m => m.enabled)?.method_code || '') } })
      .catch(e => !cancelled && setError(e instanceof Error ? e.message : 'Impossible de charger le paiement.'))
    return () => { cancelled = true }
  }, [funnelSlug, pageSlug, tariffSlug])

  const activeMethods = useMemo(() => data?.methods.filter(m => m.enabled) || [], [data])
  const selected = useMemo(() => activeMethods.find(m => m.method_code === methodCode) || activeMethods[0] || null, [activeMethods, methodCode])
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
    <div style={s.header}>
      <div><div style={s.kicker}>PAIEMENT SÉCURISÉ</div><h2 style={s.title}>{data.tariff.product_label || data.tariff.name}</h2></div>
      <strong style={s.amount}>{money(data.tariff.amount_cents, data.tariff.currency)}</strong>
    </div>

    <div style={s.fields}>
      <input placeholder="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} style={s.input}/>
      <input placeholder="Nom" value={lastName} onChange={e => setLastName(e.target.value)} style={s.input}/>
      <input type="email" placeholder="Adresse e-mail" value={email} onChange={e => setEmail(e.target.value)} style={s.input}/>
    </div>

    <div style={s.label}>Choisissez votre moyen de paiement</div>
    <div style={s.methods} role="radiogroup" aria-label="Moyens de paiement">
      {activeMethods.map(m => {
        const active = m.method_code === selected?.method_code
        const logo = getPaymentMethodLogo(m.method_code, m.config)
        return <button key={m.id} type="button" onClick={() => { setMethodCode(m.method_code); setError('') }} aria-pressed={active} style={{ ...s.method, ...(active ? s.active : {}) }}>
          {logo ? <img src={logo} alt="" style={s.logo}/> : <span style={s.fallback}>{(m.display_name || m.method_code).slice(0,2).toUpperCase()}</span>}
          <span>{m.display_name || m.method_code}</span>
        </button>
      })}
    </div>

    {selected && <div style={s.panel}>
      <div style={s.panelTitle}>
        {selected.method_code === 'visa' || selected.method_code === 'mastercard' ? 'Paiement par carte' : selected.display_name || selected.method_code}
      </div>
      {kind === 'card' ? <>
        <p style={s.panelText}>Après avoir continué, vous serez redirigé vers l’espace sécurisé du prestataire pour saisir les informations de votre carte.</p>
        <div style={s.secure}>🔒 Les données de carte sont saisies sur l’espace sécurisé du prestataire et ne sont pas stockées par Conik.</div>
      </> : kind === 'mobile_money' ? <>
        <label style={s.phoneLabel}>Numéro de téléphone</label>
        <input type="tel" inputMode="tel" autoComplete="tel" placeholder="Ex. 90 00 00 00" value={phone} onChange={e => setPhone(e.target.value)} style={s.input}/>
        <p style={s.panelText}>Le prestataire utilisera ce numéro pour démarrer la demande de paiement mobile.</p>
      </> : <p style={s.panelText}>Les informations nécessaires seront demandées par le prestataire après validation.</p>}
    </div>}

    {!activeMethods.length && <div style={s.inlineError}>Aucun moyen de paiement n’est actuellement activé pour cette page.</div>}
    {error && <div style={s.inlineError}>{error}</div>}
    <button type="button" disabled={busy || !selected} onClick={pay} style={s.pay}>{busy ? 'Redirection vers le paiement…' : selected ? `Continuer avec ${selected.display_name || selected.method_code}` : 'Aucun moyen disponible'}</button>
  </section>
}

const s: Record<string, React.CSSProperties> = {
  card:{width:'100%',boxSizing:'border-box',padding:24,borderRadius:20,background:'#fff',color:'#111827',boxShadow:'0 12px 35px rgba(0,0,0,.10)',fontFamily:'system-ui,sans-serif'},
  header:{display:'flex',justifyContent:'space-between',gap:16,alignItems:'flex-start',marginBottom:20},
  kicker:{fontSize:11,fontWeight:800,letterSpacing:'.12em',opacity:.55}, title:{margin:'5px 0 0',fontSize:21}, amount:{whiteSpace:'nowrap'},
  fields:{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginBottom:20}, input:{width:'100%',boxSizing:'border-box',padding:'13px 14px',border:'1px solid #d1d5db',borderRadius:10,fontSize:14,background:'#fff',color:'#111827'},
  label:{fontWeight:700,fontSize:14,marginBottom:10}, methods:{display:'flex',gap:10,flexWrap:'wrap',overflowX:'auto',paddingBottom:4}, method:{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,minWidth:110,minHeight:58,padding:'8px 12px',border:'1px solid #e5e7eb',borderRadius:12,background:'#fff',cursor:'pointer',whiteSpace:'nowrap',color:'#111827'}, active:{border:'2px solid #111827',padding:'7px 11px',boxShadow:'0 4px 12px rgba(0,0,0,.08)'}, logo:{width:42,height:28,objectFit:'contain'}, fallback:{minWidth:42,height:28,display:'grid',placeItems:'center',borderRadius:6,background:'#f3f4f6',fontSize:12,fontWeight:800},
  panel:{marginTop:16,padding:16,borderRadius:12,background:'#f8fafc',border:'1px solid #e5e7eb',fontSize:13,lineHeight:1.5}, panelTitle:{fontWeight:800,fontSize:15,marginBottom:6}, panelText:{margin:'6px 0',color:'#475569'}, secure:{marginTop:10,padding:10,borderRadius:9,background:'#ecfdf5',color:'#166534',fontSize:12,fontWeight:600}, phoneLabel:{display:'block',fontWeight:700,fontSize:12,margin:'10px 0 6px'},
  inlineError:{marginTop:12,padding:10,borderRadius:8,background:'#fef2f2',color:'#991b1b',fontSize:13}, pay:{width:'100%',marginTop:18,padding:'14px 18px',border:0,borderRadius:12,background:'#111827',color:'#fff',fontWeight:800,fontSize:15,cursor:'pointer'}, loading:{padding:20,textAlign:'center'}, error:{margin:20,padding:14,borderRadius:10,background:'#fef2f2',color:'#991b1b'}
}
