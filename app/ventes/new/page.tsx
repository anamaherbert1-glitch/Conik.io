'use client'

import './product-studio.css'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useRef, useState } from 'react'
import {
  ArrowLeft, FileUp, Save, Package, CircleDollarSign, CheckCircle2, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Step = 'infos' | 'fichier' | 'prix'

export default function NewProductPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('infos')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState('XOF')
  const [fileName, setFileName] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onPickFile(file: File | null) {
    if (!file) return
    setError('')
    setFileName(file.name)
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expir\u00e9e. Reconnectez-vous.')

      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()
      if (!member) throw new Error('Espace de travail introuvable.')

      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
      const path = `${member.organization_id}/${Date.now()}-${safe}`

      const { error: upErr } = await supabase.storage
        .from('product-files')
        .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' })

      if (upErr) {
        setFileUrl('')
        setError(`T\u00e9l\u00e9versement Storage indisponible. Collez une URL de fichier ci-dessous. (${upErr.message})`)
      } else {
        const { data: pub } = supabase.storage.from('product-files').getPublicUrl(path)
        setFileUrl(pub?.publicUrl || '')
        setError('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'T\u00e9l\u00e9versement impossible')
    }
    setUploading(false)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setStep('infos')
      setError('Indiquez le nom du produit.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const priceNum = Number(String(price).replace(/\s/g, '').replace(',', '.')) || 0
      const price_cents =
        currency === 'XOF' || currency === 'XAF'
          ? Math.round(priceNum)
          : Math.round(priceNum * 100)

      const r = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          product_type: 'other',
          description: description.trim() || null,
          currency,
          price_cents,
          attributes: {},
          delivery: {
            file_url: fileUrl || undefined,
            instructions: fileName ? `Fichier : ${fileName}` : undefined,
          },
          status: 'draft',
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Enregistrement impossible')
      router.push(`/ventes/${j.product.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
      setBusy(false)
    }
  }

  const steps: { id: Step; label: string; icon: typeof Package }[] = [
    { id: 'infos', label: 'Informations', icon: Package },
    { id: 'fichier', label: 'Fichier', icon: FileUp },
    { id: 'prix', label: 'Prix', icon: CircleDollarSign },
  ]

  return (
    <div className="product-studio">
      <aside className="product-studio-aside">
        <div className="product-studio-brand">
          <Link href="/ventes" className="product-studio-back">
            <ArrowLeft size={16} /> Produits
          </Link>
          <strong>Nouveau produit</strong>
        </div>
        <nav className="product-studio-nav">
          {steps.map((s) => {
            const Icon = s.icon
            const active = step === s.id
            return (
              <button key={s.id} type="button" className={active ? 'active' : ''} onClick={() => setStep(s.id)}>
                <Icon size={16} />
                {s.label}
                {(s.id === 'fichier' && fileName) || (s.id === 'infos' && name.trim()) ? (
                  <CheckCircle2 size={14} style={{ marginLeft: 'auto', opacity: 0.8 }} />
                ) : null}
              </button>
            )
          })}
        </nav>
        <div className="product-studio-aside-foot">
          <button
            type="button"
            className="primary full"
            disabled={busy}
            onClick={() => void submit({ preventDefault() {} } as FormEvent)}
          >
            <Save size={16} /> {busy ? 'Enregistrement\u2026' : 'Enregistrer'}
          </button>
        </div>
      </aside>

      <main className="product-studio-main">
        <header className="product-studio-top">
          <div>
            <h1>{name.trim() || 'Ajouter un produit'}</h1>
            <p className="muted">Configurez l\u2019offre. Le tunnel de vente se branche ensuite depuis Funnels.</p>
          </div>
          <Link href="/ventes" className="outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <X size={15} /> Fermer
          </Link>
        </header>

        {error ? <div className="error" style={{ marginBottom: 14 }}>{error}</div> : null}

        <form onSubmit={submit} className="product-studio-panel">
          {step === 'infos' && (
            <div className="product-studio-section">
              <h2>Informations</h2>
              <label className="form-label">
                Nom du produit
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Guide PDF \u2014 Lancer son offre"
                  autoFocus
                  required
                />
              </label>
              <label className="form-label">
                Description
                <textarea
                  className="form-input"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ce que l\u2019acheteur re\u00e7oit."
                  style={{ resize: 'vertical' }}
                />
              </label>
              <button type="button" className="primary" onClick={() => setStep('fichier')}>
                Continuer \u2192 Fichier
              </button>
            </div>
          )}

          {step === 'fichier' && (
            <div className="product-studio-section">
              <h2>T\u00e9l\u00e9verser le produit</h2>
              <p className="muted">PDF, ZIP, vid\u00e9o, audio\u2026 livr\u00e9 apr\u00e8s paiement via le tunnel.</p>
              <input
                ref={fileRef}
                type="file"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  void onPickFile(f)
                  e.currentTarget.value = ''
                }}
              />
              <button
                type="button"
                className="outline"
                style={{ minHeight: 120, width: '100%', display: 'grid', placeItems: 'center', gap: 8 }}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <FileUp size={28} />
                <span>{uploading ? 'T\u00e9l\u00e9versement\u2026' : fileName || 'Choisir un fichier'}</span>
                {fileUrl ? <span className="muted" style={{ fontSize: 12 }}>Fichier pr\u00eat</span> : null}
              </button>
              <label className="form-label" style={{ marginTop: 14 }}>
                Ou coller une URL de fichier
                <input
                  className="form-input"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://\u2026"
                />
              </label>
              <div className="button-row" style={{ marginTop: 8 }}>
                <button type="button" className="outline" onClick={() => setStep('infos')}>Retour</button>
                <button type="button" className="primary" onClick={() => setStep('prix')}>Continuer \u2192 Prix</button>
              </div>
            </div>
          )}

          {step === 'prix' && (
            <div className="product-studio-section">
              <h2>Prix</h2>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12 }}>
                <label className="form-label">
                  Montant
                  <input
                    className="form-input"
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder={currency === 'XOF' || currency === 'XAF' ? '25000' : '29.99'}
                  />
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
              <p className="muted" style={{ fontSize: 13 }}>
                Paiement et page de vente : configurez-les dans le tunnel (Funnels).
              </p>
              <div className="button-row">
                <button type="button" className="outline" onClick={() => setStep('fichier')}>Retour</button>
                <button type="submit" className="primary" disabled={busy}>
                  <Save size={16} /> {busy ? 'Enregistrement\u2026' : 'Enregistrer le produit'}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  )
}
