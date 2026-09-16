'use client'

import { useEffect, useMemo, useState } from 'react'
import { OFFICIAL_PAYMENT_LOGOS } from '@/lib/payment-provider-logos'

type Method = { id: string; provider_id: string; method_code: string; display_name?: string | null; enabled: boolean }
type CheckoutData = {
  funnel: { id: string; name: string; slug: string }
  paymentPage: { id: string; name: string; slug: string } | null
  tariff: { id: string; name: string; amount_cents: number; currency: string; product_label?: string | null }
  methods: Method[]
}

function formatAmount(cents: number, currency: string) {
  try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100) }
  catch { return `${(cents / 100).toFixed(2)} ${currency}` }
}

export function PublicPaymentCheckout({ funnelSlug, pageSlug, tariffSlug }: { funnelSlug: string; pageSlug: string; tariffSlug: string }) {
  const [data, setData] = useState<CheckoutData | null>(null)
  const [methodCode, setMethodCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/payments/checkout?funnel=${encodeURIComponent(funnelSlug)}&page=${encodeURIComponent(pageSlug)}&tarif=${encodeURIComponent(tariffSlug)}`)
      .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Impossible de charger le paiement.'); return j as CheckoutData })
      .then(j => { if (!cancelled) { setData(j); if (j.methods?.length) setMethodCode(j.methods[0].method_code) } })
      .catch(e => !cancelled && setError(e instanceof Error ? e.message : 'Impossible de charger le paiement.'))
    return () => { cancelled = true }
  }, [funnelSlug, pageSlug, tariffSlug])

  const selected = useMemo(() => data?.methods.find(m => m.method_code === methodCode) || null, [data, methodCode])

  async function startPayment() {
    if (!data || !selected) { setError('Sélectionnez un moyen de paiement.'); return }
    setBusy(true); setError('')
    try {
      const r = await fetch('/api/payments/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ funnelId: data.funnel.id, tariffId: data.tariff.id, paymentPageId: data.paymentPage?.id, methodCode: selected.method_code, firstName, lastName, name: `${firstName} ${lastName}`.trim(), email, phone }) })
      const checkout = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(checkout.error || 'Création de la commande impossible.')
      const init = await fetch('/api/payments/initialize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionId: checkout.transaction.id, methodCode: selected.method_code }) })
      const initialized = await init.json().catch(() => ({}))
      if (!init.ok) throw new Error(initialized.error || 'Initialisation du paiement impossible.')
      if (initialized.paymentUrl) { window.location.assign(initialized.paymentUrl); return }
      window.location.assign(`/payment/result?order=${encodeURIComponent(checkout.order.order_number)}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Paiement impossible.'); setBusy(false) }
  }

  if (error && !data) return <div style={styles.error}>{error}</div>
  if (!data) return <div style={styles.loading}>Chargement des moyens de paiement…</div>

  return <section style={styles.card} aria-label="Paiement sécurisé">
    <div style={styles.header}><div><div style={styles.kicker}>PAIEMENT SÉCURISÉ</div><h2 style={styles.title}>{data.tariff.product_label || data.tariff.name}</h2></div><strong style={styles.amount}>{formatAmount(data.tariff.amount_cents, data.tariff.currency)}</strong></div>
    <div style={styles.fields}>
      <input aria-label="Prénom" placeholder="Prénom" value={firstName} onChange={e => setFirstName(e.target.value)} style={styles.input} />
      <input aria-label="Nom" placeholder="Nom" value={lastName} onChange={e => setLastName(e.target.value)} style={styles.input} />
      <input aria-label="Adresse e-mail" type="email" placeholder="Adresse e-mail" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
      <input aria-label="Téléphone" type="tel" placeholder="Numéro de téléphone" value={phone} onChange={e => setPhone(e.target.value)} style={styles.input} />
    </div>
    <div style={styles.label}>Choisissez votre moyen de paiement</div>
    <div style={styles.methods}>{data.methods.map(method => {
      const active = method.method_code === methodCode
      const logo = OFFICIAL_PAYMENT_LOGOS[method.provider_id]
      return <button key={method.id} type="button" onClick={() => setMethodCode(method.method_code)} style={{ ...styles.method, ...(active ? styles.methodActive : {}) }} aria-pressed={active}>
        <span style={styles.logoBox}>{logo ? <img src={logo} alt="" style={styles.logo} /> : <span style={styles.initial}>{(method.display_name || method.method_code).slice(0, 1).toUpperCase()}</span>}</span>
        <span style={styles.methodName}>{method.display_name || method.method_code}</span><span style={{ ...styles.radio, ...(active ? styles.radioActive : {}) }}>{active ? '✓' : ''}</span>
      </button>
    })}</div>
    {error && <div style={styles.inlineError}>{error}</div>}
    <button type="button" disabled={busy || !selected} onClick={startPayment} style={styles.payButton}>{busy ? 'Redirection vers le paiement…' : `Payer ${formatAmount(data.tariff.amount_cents, data.tariff.currency)}`}</button>
    <div style={styles.note}>Vos informations de paiement sont traitées par le prestataire sélectionné.</div>
  </section>
}

const styles: Record<string, React.CSSProperties> = {
  card: { width: 'min(620px, calc(100vw - 32px))', margin: '24px auto', padding: 24, borderRadius: 20, background: '#fff', color: '#111827', boxShadow: '0 20px 60px rgba(0,0,0,.14)', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 20 },
  kicker: { fontSize: 11, fontWeight: 800, letterSpacing: '.12em', opacity: .55 },
  title: { margin: '5px 0 0', fontSize: 21, lineHeight: 1.25 }, amount: { fontSize: 20, whiteSpace: 'nowrap' },
  fields: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 },
  input: { width: '100%', boxSizing: 'border-box', padding: '13px 14px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14 },
  label: { fontWeight: 700, fontSize: 14, marginBottom: 10 }, methods: { display: 'grid', gap: 9 },
  method: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: 12, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', cursor: 'pointer', textAlign: 'left' },
  methodActive: { border: '2px solid #111827', padding: 11 }, logoBox: { width: 44, height: 32, display: 'grid', placeItems: 'center', borderRadius: 7, background: '#f8fafc', overflow: 'hidden', flexShrink: 0 },
  logo: { maxWidth: 38, maxHeight: 27, objectFit: 'contain' }, initial: { fontWeight: 800 }, methodName: { flex: 1, fontWeight: 600, fontSize: 14 },
  radio: { width: 20, height: 20, borderRadius: 999, border: '1px solid #cbd5e1', display: 'grid', placeItems: 'center', fontSize: 12 }, radioActive: { background: '#111827', color: '#fff', borderColor: '#111827' },
  payButton: { width: '100%', marginTop: 18, padding: '14px 18px', border: 0, borderRadius: 12, background: '#111827', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }, note: { marginTop: 10, textAlign: 'center', fontSize: 11, color: '#6b7280' },
  loading: { padding: 20, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }, error: { margin: 20, padding: 14, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontFamily: 'system-ui, sans-serif' }, inlineError: { marginTop: 12, padding: 10, borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: 13 },
}
