'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft, CheckCircle2, Copy, ExternalLink, Save, ShoppingCart, Trash2, Zap,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { formatPrice } from '@/lib/products/types'

type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  currency: string
  price_cents: number
  delivery: Record<string, string>
  funnel_id: string | null
  tariff_id?: string | null
}

export default function ProductConfigPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id || '')

  const [product, setProduct] = useState<Product | null>(null)
  const [buyLink, setBuyLink] = useState<string | null>(null)
  const [storeLink, setStoreLink] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('XOF')
  const [fileUrl, setFileUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [activating, setActivating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setError('')
    const r = await fetch(`/api/products/${id}`)
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setError(j.error || 'Produit introuvable')
      return
    }
    const p = j.product as Product
    setProduct(p)
    setName(p.name || '')
    setDescription(p.description || '')
    setCurrency(p.currency || 'XOF')
    const cents = Number(p.price_cents || 0)
    const display =
      p.currency === 'XOF' || p.currency === 'XAF' ? String(cents) : (cents / 100).toFixed(2)
    setPrice(display)
    setFileUrl(p.delivery?.file_url || '')
    setBuyLink(j.buy_link || null)
    if (typeof window !== 'undefined') {
      setStoreLink(`${window.location.origin}/p/${p.slug}`)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!product) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const priceNum = Number(String(price).replace(/\s/g, '').replace(',', '.')) || 0
      const price_cents =
        currency === 'XOF' || currency === 'XAF' ? Math.round(priceNum) : Math.round(priceNum * 100)
      const r = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          currency,
          price_cents,
          delivery: {
            ...(product.delivery || {}),
            file_url: fileUrl.trim() || undefined,
          },
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Enregistrement impossible')
      setProduct(j.product)
      setBuyLink(j.buy_link || buyLink)
      setMessage('Produit enregistr\u00e9.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    }
    setBusy(false)
  }

  async function activateSales() {
    if (!product) return
    setActivating(true)
    setMessage('')
    setError('')
    try {
      await save()
      const r = await fetch(`/api/products/${product.id}/activate-sales`, { method: 'POST' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Activation impossible')
      setProduct(j.product)
      setBuyLink(j.buy_link || null)
      setStoreLink(j.store_link || storeLink)
      setMessage('Vente activ\u00e9e. Partagez le lien d\u2019achat avec vos clients.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Activation impossible')
    }
    setActivating(false)
  }

  async function remove() {
    if (!product || !confirm('Supprimer ce produit ?')) return
    const r = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
    if (r.ok) router.push('/ventes')
    else {
      const j = await r.json().catch(() => ({}))
      setError(j.error || 'Suppression impossible')
    }
  }

  function copy(text: string) {
    void navigator.clipboard.writeText(text)
    setMessage('Lien copi\u00e9.')
  }

  if (!product && !error) {
    return (
      <AppShell active="Ventes">
        <p className="muted">Chargement\u2026</p>
      </AppShell>
    )
  }

  if (!product) {
    return (
      <AppShell active="Ventes">
        <div className="error">{error}</div>
        <Link href="/ventes" className="outline" style={{ marginTop: 12, display: 'inline-flex' }}>
          Retour
        </Link>
      </AppShell>
    )
  }

  const isLive = product.status === 'published' && Boolean(buyLink)

  return (
    <AppShell active="Ventes">
      <header>
        <div>
          <Link href="/ventes" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8, textDecoration: 'none' }}>
            <ArrowLeft size={15} /> Produits
          </Link>
          <h1 style={{ margin: 0 }}>{name || product.name}</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {isLive ? 'En vente' : 'Brouillon'} \u00b7 {formatPrice(product.price_cents, product.currency)}
          </p>
        </div>
        <div className="button-row">
          <button type="button" className="outline" disabled={busy} onClick={() => void save()}>
            <Save size={15} /> Enregistrer
          </button>
          <button type="button" className="primary" disabled={activating || busy} onClick={() => void activateSales()}>
            <Zap size={15} /> {isLive ? 'Mettre \u00e0 jour la vente' : 'Activer la vente'}
          </button>
        </div>
      </header>

      {message && (
        <div className="notice" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} /> {message}
        </div>
      )}
      {error && <div className="error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="grid" style={{ gap: 14 }}>
        <section className="panel" style={{ display: 'grid', gap: 12 }}>
          <h3 style={{ margin: 0 }}>Offre</h3>
          <label className="form-label">
            Nom
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="form-label">
            Description
            <textarea className="form-input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: 'vertical' }} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
            <label className="form-label">
              Prix
              <input className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            </label>
            <label className="form-label">
              Devise
              <select className="form-input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="XOF">XOF</option>
                <option value="XAF">XAF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </label>
          </div>
          <label className="form-label">
            Fichier / URL de livraison (apr\u00e8s paiement)
            <input className="form-input" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://\u2026" />
          </label>
        </section>

        <section className="panel" style={{ display: 'grid', gap: 12 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingCart size={18} /> Liens de vente
          </h3>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Apr\u00e8s activation, vos clients paient puis re\u00e7oivent l\u2019acc\u00e8s. Configurez un prestataire dans Int\u00e9grations si besoin.
          </p>

          {storeLink && (
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Page boutique</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{storeLink}</code>
                <button type="button" className="outline" onClick={() => copy(storeLink)}>
                  <Copy size={14} /> Copier
                </button>
                <a className="outline" href={storeLink} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} /> Ouvrir
                </a>
              </div>
            </div>
          )}

          {buyLink ? (
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Lien de paiement direct</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{buyLink}</code>
                <button type="button" className="outline" onClick={() => copy(buyLink)}>
                  <Copy size={14} /> Copier
                </button>
                <a className="outline" href={buyLink} target="_blank" rel="noreferrer">
                  <ExternalLink size={14} /> Ouvrir
                </a>
              </div>
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              Cliquez sur <b>Activer la vente</b> pour g\u00e9n\u00e9rer le tunnel, le tarif et le lien d\u2019achat.
            </p>
          )}
        </section>

        <div className="button-row">
          <button type="button" className="outline" onClick={() => void remove()} style={{ color: 'var(--error-text)' }}>
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </div>
    </AppShell>
  )
}
