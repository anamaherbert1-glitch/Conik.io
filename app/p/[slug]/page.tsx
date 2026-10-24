'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { formatPrice, PRODUCT_TYPE_LABELS, type ProductType } from '@/lib/products/types'

type Method = { id: string; method_code: string; display_name: string; provider_id: string }
type PublicProduct = {
  id: string
  name: string
  slug: string
  description: string | null
  product_type: ProductType
  currency: string
  price_cents: number
  attributes: Record<string, unknown>
  cover_url: string | null
  success_message: string | null
}

export default function PublicProductPage() {
  const params = useParams()
  const slug = String(params.slug || '')

  const [product, setProduct] = useState<PublicProduct | null>(null)
  const [methods, setMethods] = useState<Method[]>([])
  const [methodCode, setMethodCode] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ accessToken?: string; orderNumber?: string } | null>(null)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/products/public?slug=${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error || 'Produit introuvable')
        setProduct(j.product)
        setMethods(j.methods || [])
        setMethodCode(j.methods?.[0]?.method_code || '')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
  }, [slug])

  async function pay() {
    if (!product) return
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('Renseignez votre prénom, nom et e-mail.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/products/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          firstName,
          lastName,
          email,
          phone,
          methodCode: methodCode || null,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Commande impossible')

      if (j.transaction?.id) {
        const init = await fetch('/api/payments/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: j.transaction.id, methodCode }),
        })
        const initialized = await init.json().catch(() => ({}))
        if (init.ok && initialized.paymentUrl) {
          window.location.assign(initialized.paymentUrl)
          return
        }
      }

      setDone({
        accessToken: j.access?.access_token,
        orderNumber: j.order?.order_number,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Paiement impossible')
      setBusy(false)
    }
  }

  if (error && !product) {
    return (
      <div style={s.page}>
        <div style={s.error}>{error}</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={s.page}>
        <p style={{ opacity: 0.6 }}>Chargement…</p>
      </div>
    )
  }

  if (done) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <h1 style={s.title}>Merci pour votre achat</h1>
          <p>{product.success_message || 'Votre commande a été enregistrée. Vous recevrez l’accès dès confirmation du paiement.'}</p>
          {done.orderNumber && <p style={{ opacity: 0.7 }}>Réf. commande : {done.orderNumber}</p>}
          {done.accessToken && (
            <a href={`/p/${product.slug}/access?token=${encodeURIComponent(done.accessToken)}`} style={s.pay}>
              Accéder à mon produit
            </a>
          )}
        </div>
      </div>
    )
  }

  const attrs = product.attributes || {}

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.kicker}>{PRODUCT_TYPE_LABELS[product.product_type] || 'Produit'}</div>
        <h1 style={s.title}>{product.name}</h1>
        <strong style={s.price}>{formatPrice(product.price_cents, product.currency)}</strong>
        {product.description && <p style={s.desc}>{product.description}</p>}

        {Object.keys(attrs).length > 0 && (
          <ul style={s.list}>
            {attrs.format != null && <li>Format : {String(attrs.format)}</li>}
            {attrs.modules_count != null && <li>Modules : {String(attrs.modules_count)}</li>}
            {attrs.duration_hours != null && <li>Durée : {String(attrs.duration_hours)} h</li>}
            {attrs.duration_minutes != null && <li>Durée : {String(attrs.duration_minutes)} min</li>}
            {attrs.pages != null && <li>Pages : {String(attrs.pages)}</li>}
            {attrs.level != null && <li>Niveau : {String(attrs.level)}</li>}
            {attrs.resolution != null && <li>Résolution : {String(attrs.resolution)}</li>}
          </ul>
        )}

        <h2 style={s.section}>Vos coordonnées</h2>
        <div style={s.fields}>
          <input style={s.input} placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <input style={s.input} placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <input style={{ ...s.input, gridColumn: '1 / -1' }} type="email" placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input style={{ ...s.input, gridColumn: '1 / -1' }} type="tel" placeholder="Téléphone (Mobile Money)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        {methods.length > 0 && (
          <>
            <h2 style={s.section}>Moyen de paiement</h2>
            <div style={s.methods}>
              {methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethodCode(m.method_code)}
                  style={{ ...s.method, ...(methodCode === m.method_code ? s.methodActive : {}) }}
                >
                  {m.display_name || m.method_code}
                </button>
              ))}
            </div>
          </>
        )}

        {error && <div style={s.error}>{error}</div>}

        <button type="button" style={s.pay} disabled={busy} onClick={() => void pay()}>
          {busy ? 'Redirection…' : `Payer ${formatPrice(product.price_cents, product.currency)}`}
        </button>
        <p style={{ fontSize: 12, opacity: 0.55, marginTop: 12, textAlign: 'center' }}>
          Paiement sécurisé · Conik.io
        </p>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: '#0f172a', color: '#0f172a', fontFamily: 'system-ui, sans-serif' },
  card: { width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,.35)' },
  kicker: { fontSize: 11, fontWeight: 800, letterSpacing: '.12em', opacity: 0.5 },
  title: { margin: '8px 0 4px', fontSize: 24 },
  price: { fontSize: 22, display: 'block', marginBottom: 12 },
  desc: { lineHeight: 1.5, color: '#475569', fontSize: 15 },
  list: { paddingLeft: 18, color: '#334155', fontSize: 14, lineHeight: 1.6 },
  section: { fontSize: 15, margin: '20px 0 10px' },
  fields: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  input: { width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 },
  methods: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  method: { padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13 },
  methodActive: { border: '2px solid #0f172a', fontWeight: 700 },
  pay: { width: '100%', marginTop: 18, padding: '14px 18px', border: 0, borderRadius: 12, background: '#0f172a', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', textAlign: 'center', textDecoration: 'none', display: 'block' },
  error: { marginTop: 12, padding: 12, borderRadius: 10, background: '#fef2f2', color: '#991b1b', fontSize: 14 },
}
