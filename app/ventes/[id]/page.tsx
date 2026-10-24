'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft, CheckCircle2, Copy, CreditCard, ExternalLink, Link2, Save, Trash2, Zap,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import {
  FORMATION_FORMAT_LABELS,
  FORMATION_FORMATS,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPES,
  VIDEO_FORMATS,
  formatPrice,
  type ProductType,
} from '@/lib/products/types'

type Funnel = { id: string; name: string; slug: string; status: string }
type Provider = { id: string; provider: string; label: string; status: string }
type Product = {
  id: string
  name: string
  slug: string
  description: string | null
  product_type: ProductType
  status: string
  currency: string
  price_cents: number
  attributes: Record<string, unknown>
  delivery: Record<string, string>
  funnel_id: string | null
  payment_provider_id: string | null
  enabled_methods: string[]
  success_message: string | null
}

const PROVIDER_LABEL: Record<string, string> = {
  wave: 'Wave', cinetpay: 'CinetPay', flutterwave: 'Flutterwave', paydunya: 'PayDunya',
  saspay: 'SasPay', ligdicash: 'LigdiCash', hub2: 'Hub2', fedapay: 'FedaPay', campay: 'CamPay',
}

export default function ProductConfigPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id || '')

  const [product, setProduct] = useState<Product | null>(null)
  const [funnels, setFunnels] = useState<Funnel[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [productType, setProductType] = useState<ProductType>('other')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('XOF')
  const [attributes, setAttributes] = useState<Record<string, unknown>>({})
  const [delivery, setDelivery] = useState<Record<string, string>>({})
  const [funnelId, setFunnelId] = useState('')
  const [providerId, setProviderId] = useState('')
  const [status, setStatus] = useState('draft')
  const [successMessage, setSuccessMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [origin, setOrigin] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const [pr, fr, pvr] = await Promise.all([
      fetch(`/api/products/${id}`),
      fetch('/api/funnels'),
      fetch('/api/payments/providers'),
    ])
    const pj = await pr.json()
    if (!pr.ok) {
      setError(pj.error || 'Produit introuvable')
      return
    }
    const p = pj.product as Product
    setProduct(p)
    setName(p.name)
    setDescription(p.description || '')
    setProductType(p.product_type)
    setCurrency(p.currency)
    setPrice(
      p.currency === 'XOF' || p.currency === 'XAF'
        ? String(p.price_cents)
        : String(p.price_cents / 100),
    )
    setAttributes(p.attributes || {})
    setDelivery((p.delivery as Record<string, string>) || {})
    setFunnelId(p.funnel_id || '')
    setProviderId(p.payment_provider_id || '')
    setStatus(p.status)
    setSuccessMessage(p.success_message || '')

    if (fr.ok) {
      const fj = await fr.json()
      setFunnels(fj.funnels || [])
    }
    if (pvr.ok) {
      const pvj = await pvr.json()
      setProviders((pvj.providers || []).filter((x: Provider) => ['connected', 'active'].includes(x.status)))
    }
  }, [id])

  useEffect(() => {
    void load()
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '')
  }, [load])

  function setAttr(key: string, value: unknown) {
    setAttributes((prev) => ({ ...prev, [key]: value }))
  }
  function setDel(key: string, value: string) {
    setDelivery((prev) => ({ ...prev, [key]: value }))
  }

  async function save(nextStatus?: string) {
    if (!id) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const priceNum = Number(price)
      const price_cents =
        currency === 'XOF' || currency === 'XAF'
          ? Math.round(priceNum)
          : Math.round(priceNum * 100)
      const r = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          product_type: productType,
          currency,
          price_cents,
          attributes,
          delivery,
          funnel_id: funnelId || null,
          payment_provider_id: providerId || null,
          success_message: successMessage || null,
          status: nextStatus || status,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Enregistrement impossible')
      setProduct(j.product)
      setStatus(j.product.status)
      setMessage(nextStatus === 'published' ? 'Produit publié. Le lien de vente est actif.' : 'Enregistré.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('Supprimer ce produit définitivement ?')) return
    const r = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (r.ok) router.push('/ventes')
    else {
      const j = await r.json().catch(() => ({}))
      setError(j.error || 'Suppression impossible')
    }
  }

  function copyLink() {
    if (!product) return
    const link = `${origin}/p/${product.slug}`
    void navigator.clipboard.writeText(link)
    setMessage(`Lien copié : ${link}`)
  }

  if (!product && !error) {
    return (
      <AppShell active="Ventes">
        <p className="muted">Chargement…</p>
      </AppShell>
    )
  }

  return (
    <AppShell active="Ventes">
      <header>
        <div>
          <Link href="/ventes" className="back" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <ArrowLeft size={15} /> Produits
          </Link>
          <small>ESPACE DE VENTE</small>
          <h1>{product?.name || 'Produit'}</h1>
          <p className="muted">
            {PRODUCT_TYPE_LABELS[productType]} · {status === 'published' ? 'Publié' : status === 'archived' ? 'Archivé' : 'Brouillon'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="outline" onClick={copyLink} disabled={!product}>
            <Copy size={15} /> Copier le lien
          </button>
          {status !== 'published' ? (
            <button type="button" className="primary" disabled={busy} onClick={() => void save('published')}>
              <ExternalLink size={15} /> Publier
            </button>
          ) : (
            <button type="button" className="outline" disabled={busy} onClick={() => void save('draft')}>
              Dépublier
            </button>
          )}
          <button type="button" className="primary" disabled={busy} onClick={() => void save()}>
            <Save size={15} /> {busy ? '…' : 'Enregistrer'}
          </button>
        </div>
      </header>

      {message && (
        <div className="capture-alert success" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <CheckCircle2 size={17} /> {message}
        </div>
      )}
      {error && <div className="error">{error}</div>}

      <div style={{ display: 'grid', gap: 16, maxWidth: 800 }}>
        <section className="panel" style={{ padding: 20, display: 'grid', gap: 12 }}>
          <h3>Informations</h3>
          <label className="form-label">
            Nom
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="form-label">
            Type
            <select className="form-input" value={productType} onChange={(e) => setProductType(e.target.value as ProductType)}>
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Description
            <textarea className="form-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="form-label">
              Prix
              <input className="form-input" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
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
          {product && (
            <p className="muted" style={{ fontSize: 13 }}>
              Prix affiché : <strong>{formatPrice(
                currency === 'XOF' || currency === 'XAF' ? Math.round(Number(price) || 0) : Math.round((Number(price) || 0) * 100),
                currency,
              )}</strong>
            </p>
          )}
        </section>

        <section className="panel" style={{ padding: 20, display: 'grid', gap: 12 }}>
          <h3>Rubriques — {PRODUCT_TYPE_LABELS[productType]}</h3>
          {productType === 'formation' && (
            <>
              <label className="form-label">
                Format
                <select className="form-input" value={String(attributes.format || '')} onChange={(e) => setAttr('format', e.target.value)}>
                  <option value="">—</option>
                  {FORMATION_FORMATS.map((f) => (
                    <option key={f} value={f}>{FORMATION_FORMAT_LABELS[f]}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label className="form-label">Modules<input className="form-input" type="number" value={String(attributes.modules_count ?? '')} onChange={(e) => setAttr('modules_count', Number(e.target.value) || 0)} /></label>
                <label className="form-label">Durée (h)<input className="form-input" type="number" value={String(attributes.duration_hours ?? '')} onChange={(e) => setAttr('duration_hours', Number(e.target.value) || 0)} /></label>
              </div>
              <label className="form-label">
                Niveau
                <select className="form-input" value={String(attributes.level || '')} onChange={(e) => setAttr('level', e.target.value)}>
                  <option value="">—</option>
                  <option value="debutant">Débutant</option>
                  <option value="intermediaire">Intermédiaire</option>
                  <option value="avance">Avancé</option>
                  <option value="tous">Tous niveaux</option>
                </select>
              </label>
            </>
          )}
          {productType === 'ebook' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="form-label">Pages<input className="form-input" type="number" value={String(attributes.pages ?? '')} onChange={(e) => setAttr('pages', Number(e.target.value) || 0)} /></label>
              <label className="form-label">
                Format
                <select className="form-input" value={String(attributes.format || 'pdf')} onChange={(e) => setAttr('format', e.target.value)}>
                  <option value="pdf">PDF</option>
                  <option value="epub">ePub</option>
                  <option value="mobi">Mobi</option>
                </select>
              </label>
            </div>
          )}
          {productType === 'video' && (
            <>
              <label className="form-label">
                Format vidéo
                <select className="form-input" value={String(attributes.format || '')} onChange={(e) => setAttr('format', e.target.value)}>
                  <option value="">—</option>
                  {VIDEO_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label className="form-label">Durée (min)<input className="form-input" type="number" value={String(attributes.duration_minutes ?? '')} onChange={(e) => setAttr('duration_minutes', Number(e.target.value) || 0)} /></label>
                <label className="form-label">Résolution<input className="form-input" value={String(attributes.resolution || '')} onChange={(e) => setAttr('resolution', e.target.value)} /></label>
              </div>
            </>
          )}

          <h4 style={{ marginTop: 8 }}>Livraison</h4>
          <label className="form-label">URL fichier<input className="form-input" value={delivery.file_url || ''} onChange={(e) => setDel('file_url', e.target.value)} /></label>
          <label className="form-label">URL vidéo<input className="form-input" value={delivery.video_url || ''} onChange={(e) => setDel('video_url', e.target.value)} /></label>
          <label className="form-label">URL cours<input className="form-input" value={delivery.course_url || ''} onChange={(e) => setDel('course_url', e.target.value)} /></label>
          <label className="form-label">Instructions<textarea className="form-input" rows={2} value={delivery.instructions || ''} onChange={(e) => setDel('instructions', e.target.value)} /></label>
          <label className="form-label">Message après achat<textarea className="form-input" rows={2} value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} placeholder="Merci ! Voici votre accès…" /></label>
        </section>

        <section className="panel" style={{ padding: 20, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} />
            <h3 style={{ margin: 0 }}>Prestataire de paiement</h3>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Connectez d’abord un prestataire dans Intégrations. L’acheteur choisira carte, Wave, Mobile Money, etc. selon ce que le prestataire propose.
          </p>
          <label className="form-label">
            Prestataire
            <select className="form-input" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
              <option value="">— Choisir —</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {PROVIDER_LABEL[p.provider] || p.provider} · {p.label}
                </option>
              ))}
            </select>
          </label>
          {providers.length === 0 && (
            <p className="muted">
              Aucun prestataire actif.{' '}
              <Link href="/integrations" style={{ color: 'var(--accent)', fontWeight: 700 }}>Ouvrir Intégrations</Link>
            </p>
          )}
        </section>

        <section className="panel" style={{ padding: 20, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} />
            <h3 style={{ margin: 0 }}>Tunnel de vente (optionnel)</h3>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Associez ce produit à un tunnel existant pour l’intégrer dans un parcours de pages.
          </p>
          <label className="form-label">
            Tunnel
            <select className="form-input" value={funnelId} onChange={(e) => setFunnelId(e.target.value)}>
              <option value="">— Aucun —</option>
              {funnels.map((f) => (
                <option key={f.id} value={f.id}>{f.name} (/{f.slug})</option>
              ))}
            </select>
          </label>
          {funnelId && (
            <Link className="outline" href={`/funnels/${funnelId}`} style={{ width: 'fit-content' }}>
              Ouvrir le tunnel
            </Link>
          )}
          <Link className="outline" href="/funnels/new" style={{ width: 'fit-content' }}>
            Créer un nouveau tunnel
          </Link>
        </section>

        <section className="panel" style={{ padding: 20, display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link2 size={18} />
            <h3 style={{ margin: 0 }}>Lien de partage</h3>
          </div>
          {product && (
            <>
              <code style={{ wordBreak: 'break-all', padding: 12, background: 'var(--panel-2, #f3f4f6)', borderRadius: 8 }}>
                {origin}/p/{product.slug}
              </code>
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                Partagez ce lien. L’acheteur renseigne ses coordonnées, paie, puis reçoit l’accès au produit.
                {status !== 'published' && ' Publiez d’abord le produit pour activer le lien.'}
              </p>
              <button type="button" className="outline" onClick={copyLink} style={{ width: 'fit-content' }}>
                <Copy size={14} /> Copier
              </button>
            </>
          )}
        </section>

        <button type="button" className="outline" onClick={() => void remove()} style={{ color: '#b91c1c', width: 'fit-content' }}>
          <Trash2 size={15} /> Supprimer le produit
        </button>
      </div>
    </AppShell>
  )
}
