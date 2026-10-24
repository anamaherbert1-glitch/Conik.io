'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState, Suspense } from 'react'
import {
  ArrowLeft, BookOpen, Film, GraduationCap, Package, Save, ShoppingBag,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import {
  FORMATION_FORMAT_LABELS,
  FORMATION_FORMATS,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPES,
  VIDEO_FORMATS,
  slugify,
  type ProductType,
} from '@/lib/products/types'

const TYPE_ICONS: Record<ProductType, React.ElementType> = {
  formation: GraduationCap,
  ebook: BookOpen,
  video: Film,
  bundle: Package,
  other: ShoppingBag,
}

function NewProductForm() {
  const router = useRouter()
  const search = useSearchParams()
  const initialType = (search.get('type') as ProductType) || 'formation'

  const [name, setName] = useState('')
  const [productType, setProductType] = useState<ProductType>(
    PRODUCT_TYPES.includes(initialType) ? initialType : 'formation',
  )
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('XOF')
  const [attributes, setAttributes] = useState<Record<string, unknown>>({})
  const [delivery, setDelivery] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Reset type-specific fields when type changes
    setAttributes({})
  }, [productType])

  const slugPreview = useMemo(() => slugify(name || 'produit'), [name])

  function setAttr(key: string, value: unknown) {
    setAttributes((prev) => ({ ...prev, [key]: value }))
  }

  function setDel(key: string, value: string) {
    setDelivery((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Le nom du produit est requis.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const priceNum = Number(price)
      const price_cents =
        currency === 'XOF' || currency === 'XAF'
          ? Math.round(priceNum)
          : Math.round(priceNum * 100)

      const r = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          product_type: productType,
          description: description.trim() || null,
          currency,
          price_cents,
          attributes,
          delivery,
          status: 'draft',
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Création impossible')
      router.push(`/ventes/${j.product.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible')
      setBusy(false)
    }
  }

  return (
    <AppShell active="Ventes">
      <header>
        <div>
          <Link href="/ventes" className="back" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <ArrowLeft size={15} /> Retour aux ventes
          </Link>
          <small>NOUVEAU PRODUIT</small>
          <h1>Ajouter un produit</h1>
          <p className="muted">Choisissez le type, renseignez les rubriques, puis configurez paiement et tunnel.</p>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <form onSubmit={submit} className="panel" style={{ maxWidth: 720, display: 'grid', gap: 20, padding: 24 }}>
        <section>
          <h3 style={{ marginBottom: 12 }}>1. Type de produit</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
            {PRODUCT_TYPES.map((t) => {
              const Icon = TYPE_ICONS[t]
              const active = productType === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setProductType(t)}
                  className={active ? 'primary' : 'outline'}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 14 }}
                >
                  <Icon size={22} />
                  <span style={{ fontSize: 13 }}>{PRODUCT_TYPE_LABELS[t]}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section style={{ display: 'grid', gap: 12 }}>
          <h3>2. Informations générales</h3>
          <label className="form-label">
            Nom du produit *
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Formation Marketing Digital" required />
          </label>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Lien public : <code>/p/{slugPreview}</code>
          </p>
          <label className="form-label">
            Description
            <textarea className="form-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ce que l’acheteur reçoit…" />
          </label>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="form-label">
              Prix
              <input className="form-input" type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="25000" required />
            </label>
            <label className="form-label">
              Devise
              <select className="form-input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="XOF">XOF (FCFA)</option>
                <option value="XAF">XAF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </label>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 12 }}>
          <h3>3. Rubriques — {PRODUCT_TYPE_LABELS[productType]}</h3>
          {productType === 'formation' && (
            <>
              <label className="form-label">
                Format de la formation
                <select
                  className="form-input"
                  value={String(attributes.format || '')}
                  onChange={(e) => setAttr('format', e.target.value)}
                >
                  <option value="">— Choisir —</option>
                  {FORMATION_FORMATS.map((f) => (
                    <option key={f} value={f}>{FORMATION_FORMAT_LABELS[f]}</option>
                  ))}
                </select>
              </label>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label className="form-label">
                  Nombre de modules
                  <input className="form-input" type="number" min="0" value={String(attributes.modules_count ?? '')} onChange={(e) => setAttr('modules_count', Number(e.target.value) || 0)} />
                </label>
                <label className="form-label">
                  Durée (heures)
                  <input className="form-input" type="number" min="0" step="0.5" value={String(attributes.duration_hours ?? '')} onChange={(e) => setAttr('duration_hours', Number(e.target.value) || 0)} />
                </label>
              </div>
              <label className="form-label">
                Niveau
                <select className="form-input" value={String(attributes.level || '')} onChange={(e) => setAttr('level', e.target.value)}>
                  <option value="">— Choisir —</option>
                  <option value="debutant">Débutant</option>
                  <option value="intermediaire">Intermédiaire</option>
                  <option value="avance">Avancé</option>
                  <option value="tous">Tous niveaux</option>
                </select>
              </label>
              <label className="form-label">
                Langue
                <input className="form-input" value={String(attributes.language || '')} onChange={(e) => setAttr('language', e.target.value)} placeholder="Français" />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={Boolean(attributes.includes_certificate)} onChange={(e) => setAttr('includes_certificate', e.target.checked)} />
                Certificat inclus
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={Boolean(attributes.includes_community)} onChange={(e) => setAttr('includes_community', e.target.checked)} />
                Accès communauté
              </label>
            </>
          )}

          {productType === 'ebook' && (
            <>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label className="form-label">
                  Nombre de pages
                  <input className="form-input" type="number" min="0" value={String(attributes.pages ?? '')} onChange={(e) => setAttr('pages', Number(e.target.value) || 0)} />
                </label>
                <label className="form-label">
                  Format fichier
                  <select className="form-input" value={String(attributes.format || 'pdf')} onChange={(e) => setAttr('format', e.target.value)}>
                    <option value="pdf">PDF</option>
                    <option value="epub">ePub</option>
                    <option value="mobi">Mobi</option>
                    <option value="other">Autre</option>
                  </select>
                </label>
              </div>
              <label className="form-label">
                Auteur
                <input className="form-input" value={String(attributes.author || '')} onChange={(e) => setAttr('author', e.target.value)} />
              </label>
              <label className="form-label">
                Langue
                <input className="form-input" value={String(attributes.language || '')} onChange={(e) => setAttr('language', e.target.value)} placeholder="Français" />
              </label>
            </>
          )}

          {productType === 'video' && (
            <>
              <label className="form-label">
                Type / format vidéo
                <select className="form-input" value={String(attributes.format || '')} onChange={(e) => setAttr('format', e.target.value)}>
                  <option value="">— Choisir —</option>
                  {VIDEO_FORMATS.map((f) => (
                    <option key={f} value={f}>{f.toUpperCase()}</option>
                  ))}
                </select>
              </label>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label className="form-label">
                  Durée (minutes)
                  <input className="form-input" type="number" min="0" value={String(attributes.duration_minutes ?? '')} onChange={(e) => setAttr('duration_minutes', Number(e.target.value) || 0)} />
                </label>
                <label className="form-label">
                  Résolution
                  <input className="form-input" value={String(attributes.resolution || '')} onChange={(e) => setAttr('resolution', e.target.value)} placeholder="1080p" />
                </label>
              </div>
              <label className="form-label">
                Langue
                <input className="form-input" value={String(attributes.language || '')} onChange={(e) => setAttr('language', e.target.value)} />
              </label>
            </>
          )}

          {productType === 'bundle' && (
            <label className="form-label">
              Nombre d’éléments inclus
              <input className="form-input" type="number" min="1" value={String(attributes.items_count ?? '')} onChange={(e) => setAttr('items_count', Number(e.target.value) || 0)} />
            </label>
          )}

          {productType === 'other' && (
            <p className="muted">Produit digital personnalisé. Ajoutez les détails de livraison ci-dessous.</p>
          )}
        </section>

        <section style={{ display: 'grid', gap: 12 }}>
          <h3>4. Livraison (après paiement)</h3>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Ces URLs ne sont visibles qu’après un paiement réussi.
          </p>
          {(productType === 'ebook' || productType === 'bundle' || productType === 'other') && (
            <label className="form-label">
              URL du fichier (PDF, ZIP…)
              <input className="form-input" value={delivery.file_url || ''} onChange={(e) => setDel('file_url', e.target.value)} placeholder="https://…" />
            </label>
          )}
          {(productType === 'video' || productType === 'formation') && (
            <label className="form-label">
              URL vidéo / plateforme
              <input className="form-input" value={delivery.video_url || ''} onChange={(e) => setDel('video_url', e.target.value)} placeholder="https://…" />
            </label>
          )}
          {productType === 'formation' && (
            <label className="form-label">
              URL espace cours
              <input className="form-input" value={delivery.course_url || ''} onChange={(e) => setDel('course_url', e.target.value)} placeholder="https://…" />
            </label>
          )}
          <label className="form-label">
            Instructions d’accès
            <textarea className="form-input" rows={2} value={delivery.instructions || ''} onChange={(e) => setDel('instructions', e.target.value)} placeholder="Ex. Téléchargez le PDF via le lien ci-dessous…" />
          </label>
        </section>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button type="submit" className="primary" disabled={busy}>
            <Save size={16} /> {busy ? 'Création…' : 'Créer le produit'}
          </button>
          <Link className="outline" href="/ventes">Annuler</Link>
        </div>
      </form>
    </AppShell>
  )
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<AppShell active="Ventes"><p className="muted">Chargement…</p></AppShell>}>
      <NewProductForm />
    </Suspense>
  )
}
