'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Copy, CreditCard, Plus, Save, Trash2, UploadCloud, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PaymentMethodSelector } from '@/components/payment-method-selector'

type Provider = { id: string; provider: string; label: string; status: string }
type Tariff = {
  id: string
  name: string
  amount_cents: number
  currency: string
  slug: string
  product_label: string | null
  active: boolean
}
type Payment = {
  id: string
  name: string
  slug: string
  payment_enabled: boolean
  payment_html: string | null
  payment_css: string | null
  payment_js: string | null
  payment_provider_id: string | null
}

const PROVIDER_LABEL: Record<string, string> = {
  wave: 'Wave',
  cinetpay: 'CinetPay',
  flutterwave: 'Flutterwave',
  paydunya: 'PayDunya',
  saspay: 'SasPay',
  ligdicash: 'LigdiCash',
  hub2: 'Hub2',
  fedapay: 'FedaPay',
  campay: 'CamPay',
  other: 'Autre',
}

function formatAmount(cents: number, currency: string) {
  if (currency === 'XOF' || currency === 'XAF') return `${cents.toLocaleString('fr-FR')} ${currency}`
  return `${(cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`
}

export default function PaymentPageConfig({ params }: { params: Promise<{ id: string }> }) {
  const [funnelId, setFunnelId] = useState('')
  const [payment, setPayment] = useState<Payment | null>(null)
  const [providers, setProviders] = useState<Provider[]>([])
  const [tariffs, setTariffs] = useState<Tariff[]>([])
  const [enabled, setEnabled] = useState(false)
  const [providerId, setProviderId] = useState('')
  const [tariffName, setTariffName] = useState('')
  const [tariffAmount, setTariffAmount] = useState('')
  const [tariffCurrency, setTariffCurrency] = useState('XOF')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    params.then((p) => setFunnelId(p.id))
    setOrigin(typeof window !== 'undefined' ? window.location.origin : '')
  }, [params])

  async function load() {
    if (!funnelId) return
    const r = await fetch(`/api/funnels/payment-page?funnelId=${encodeURIComponent(funnelId)}`)
    const j = await r.json()
    if (!r.ok) {
      setError(j.error || 'Chargement impossible')
      return
    }
    setPayment(j.payment)
    setProviders(j.providers || [])
    setTariffs(j.tariffs || [])
    setEnabled(Boolean(j.payment.payment_enabled))
    setProviderId(j.payment.payment_provider_id || '')
  }

  useEffect(() => {
    void load()
  }, [funnelId])

  async function importFiles(files: File[]) {
    if (!funnelId || !files.length) return
    if (!providerId && providers.length === 0) {
      setError('Connectez d’abord un prestataire dans Intégrations avant d’enregistrer la page de paiement.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const body = new FormData()
      body.append('funnelId', funnelId)
      body.append('enabled', String(enabled))
      body.append('providerId', providerId)
      files.forEach((f, i) => body.append(i === 0 ? 'file' : `file_${i}`, f))
      const r = await fetch('/api/funnels/payment-page', { method: 'POST', body })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Import impossible')
      setPayment(j.payment)
      setMessage('Page de paiement importée (HTML / CSS / JS).')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import impossible')
    } finally {
      setBusy(false)
    }
  }

  async function saveSettings() {
    if (!funnelId) return
    if (enabled && !providerId) {
      setError('Choisissez un prestataire avant d’activer la page de paiement.')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const r = await fetch('/api/funnels/payment-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_settings', funnelId, enabled, providerId }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Enregistrement impossible')
      setPayment(j.payment)
      setMessage('Configuration enregistrée.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
    } finally {
      setBusy(false)
    }
  }

  async function addTariff(e: React.FormEvent) {
    e.preventDefault()
    if (!funnelId) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const r = await fetch('/api/funnels/payment-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_tariff',
          funnelId,
          name: tariffName || `Tarif ${tariffAmount}`,
          amount: Number(tariffAmount),
          currency: tariffCurrency,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Impossible de créer le tarif')
      setTariffs((t) => [...t, j.tariff].sort((a, b) => a.amount_cents - b.amount_cents))
      setTariffName('')
      setTariffAmount('')
      setMessage('Tarif créé. Copiez son lien sur le bouton du produit correspondant.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur tarif')
    } finally {
      setBusy(false)
    }
  }

  async function removeTariff(id: string) {
    if (!confirm('Supprimer ce tarif ?')) return
    const r = await fetch('/api/funnels/payment-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_tariff', funnelId, tariffId: id }),
    })
    if (r.ok) setTariffs((t) => t.filter((x) => x.id !== id))
  }

  function copyLink(tariff: Tariff) {
    if (!payment?.slug) return
    const link = `${origin}/pay?funnel=${encodeURIComponent(payment.slug)}&tarif=${encodeURIComponent(tariff.slug)}`
    void navigator.clipboard.writeText(link)
    setMessage(`Lien copié : ${link}`)
  }

  const selectedProvider = providers.find((p) => p.id === providerId)

  const preview = useMemo(() => {
    if (!payment?.payment_html) return ''
    return (
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      `<style>${payment.payment_css || ''}</style></head><body>${payment.payment_html}` +
      `<script>${payment.payment_js || ''}<` +
      '/script></body></html>'
    )
  }, [payment])

  return (
    <div className="capture-workspace">
      <Link href={`/funnels/${funnelId}`} className="back">
        <ArrowLeft size={15} /> Tunnel
      </Link>

      <div className="capture-topbar">
        <div className="capture-title">
          <span className="capture-kicker">PAGE DE PAIEMENT</span>
          <div className="capture-title-row">
            <h1>{payment?.name || 'Paiement'}</h1>
            <span className={`capture-status ${enabled && payment?.payment_html ? 'is-on' : ''}`}>
              <span />
              {enabled && payment?.payment_html ? 'Activée' : 'Non configurée'}
            </span>
          </div>
          <p>
            Importez votre page HTML. Créez des tarifs : chaque tarif donne un lien à coller sur le bouton du produit.
            Prestataire obligatoire avant activation.
          </p>
        </div>
        <div className="capture-actions">
          <Link className="outline" href="/integrations">
            <CreditCard size={15} /> Prestataires
          </Link>
          <button className="primary" onClick={() => void saveSettings()} disabled={busy}>
            <Save size={15} /> {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {message && <div className="capture-alert success"><CheckCircle2 size={17} /> {message}</div>}
      {error && <div className="capture-alert error"><X size={17} /> {error}</div>}

      <div className="capture-layout">
        <main className="capture-main">
          <section className="capture-card">
            <div className="capture-card-heading">
              <div className="heading-icon"><CreditCard size={19} /></div>
              <div>
                <h2>1. Prestataire de paiement</h2>
                <p>Choisissez le prestataire connecté qui exécutera les paiements de cette page.</p>
              </div>
            </div>
            <div className="capture-settings-grid">
              <label className="capture-field">
                <span>Prestataire</span>
                <select value={providerId} onChange={(e) => setProviderId(e.target.value)}>
                  <option value="">— Choisir —</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {PROVIDER_LABEL[p.provider] || p.provider} · {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="capture-toggle-field">
                <span>Page de paiement activée</span>
                <button type="button" className={`capture-toggle ${enabled ? 'on' : ''}`} onClick={() => setEnabled((v) => !v)}>
                  <span />
                </button>
              </label>
            </div>
            {providers.length === 0 && (
              <p className="muted" style={{ padding: '0 20px 16px' }}>
                Aucun prestataire connecté.{' '}
                <Link href="/integrations" style={{ color: 'var(--accent)', fontWeight: 700 }}>Aller dans Intégrations</Link>
              </p>
            )}
          </section>

          {payment?.id && selectedProvider && (
            <PaymentMethodSelector
              paymentPageId={payment.id}
              providerId={selectedProvider.id}
              provider={selectedProvider.provider}
            />
          )}

          <section className="capture-card">
            <div className="capture-card-heading">
              <div className="heading-icon"><UploadCloud size={19} /></div>
              <div>
                <h2>2. Importer la page (HTML + CSS + JS)</h2>
                <p>Le design importé reste la partie principale. Le moteur de paiement sera rendu sous ce design côté public.</p>
              </div>
            </div>
            <div className="capture-import-row">
              <label className="capture-upload-button">
                <UploadCloud size={17} />
                Importer HTML / CSS / JS
                <input
                  type="file"
                  accept=".html,.htm,.css,.js,text/html,text/css,application/javascript"
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length) void importFiles(files)
                    e.currentTarget.value = ''
                  }}
                />
              </label>
              <div className="capture-file-state">
                <div className="file-icon">PAY</div>
                <div>
                  <b>{payment?.payment_html ? 'Page enregistrée' : 'Aucun fichier'}</b>
                  <small>{payment?.payment_html ? ['HTML', payment.payment_css ? 'CSS' : null, payment.payment_js ? 'JS' : null].filter(Boolean).join(' + ') : 'Importez votre maquette de paiement'}</small>
                </div>
                {payment?.payment_html && <CheckCircle2 size={17} className="file-ok" />}
              </div>
            </div>
            {preview && (
              <div className="capture-preview-frame-wrap" style={{ margin: 16 }}>
                <iframe title="Aperçu paiement" sandbox="allow-scripts allow-forms" srcDoc={preview} className="capture-preview-frame" />
              </div>
            )}
          </section>

          <section className="capture-card">
            <div className="capture-card-heading">
              <div className="heading-icon"><Plus size={19} /></div>
              <div>
                <h2>3. Tarifs (liens préconfigurés)</h2>
                <p>Créez un tarif par produit (2500, 5000…). Chaque tarif a un lien unique à coller sur le bouton « Acheter » de votre page de vente.</p>
              </div>
            </div>

            <form onSubmit={addTariff} style={{ display: 'grid', gap: 12, padding: '0 20px 16px', maxWidth: 560 }}>
              <div className="form-grid">
                <label className="form-label">
                  Nom
                  <input className="form-input" value={tariffName} onChange={(e) => setTariffName(e.target.value)} placeholder="Formation Pro" />
                </label>
                <label className="form-label">
                  Montant
                  <input className="form-input" type="number" min="1" required value={tariffAmount} onChange={(e) => setTariffAmount(e.target.value)} placeholder="2500" />
                </label>
              </div>
              <label className="form-label">
                Devise
                <select className="form-input" value={tariffCurrency} onChange={(e) => setTariffCurrency(e.target.value)}>
                  <option value="XOF">XOF (FCFA)</option>
                  <option value="XAF">XAF</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <button className="primary" type="submit" disabled={busy}><Plus size={15} /> Ajouter le tarif</button>
            </form>

            <div className="funnel-table" style={{ padding: '0 12px 16px' }}>
              {tariffs.length === 0 && (
                <div className="empty" style={{ height: 'auto', padding: 24 }}>
                  <b>Aucun tarif</b>
                  <span>Ajoutez 2500, 5000… puis copiez chaque lien sur le bon bouton produit.</span>
                </div>
              )}
              {tariffs.map((t) => (
                <div className="funnel-row" key={t.id}>
                  <div>
                    <b>{t.name} · {formatAmount(t.amount_cents, t.currency)}</b>
                    <span style={{ wordBreak: 'break-all' }}>/pay?funnel={payment?.slug}&tarif={t.slug}</span>
                  </div>
                  <div className="button-row">
                    <button type="button" className="outline" onClick={() => copyLink(t)}><Copy size={14} /> Copier le lien</button>
                    <button type="button" className="outline" onClick={() => void removeTariff(t.id)}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
