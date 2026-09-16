'use client'

import { useEffect, useMemo, useState } from 'react'
import { PublicPaymentCheckout } from '@/components/public-payment-checkout'

type PreviewData = { page?: { html?: string; css?: string; js?: string } | null }

export default function PublicPayPage() {
  const [params, setParams] = useState<{ funnel: string; tarif: string } | null>(null)
  const [data, setData] = useState<PreviewData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const funnel = q.get('funnel')
    const tarif = q.get('tarif')
    if (!funnel || !tarif) {
      setError('Lien de paiement invalide.')
      return
    }
    setParams({ funnel, tarif })
    fetch(`/api/payments/checkout?funnel=${encodeURIComponent(funnel)}&tarif=${encodeURIComponent(tarif)}`)
      .then(async r => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error || 'Paiement introuvable')
        setData(j)
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Erreur de chargement'))
  }, [])

  const preview = useMemo(() => {
    if (!data?.page?.html) return ''
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      `<style>${data.page.css || ''}</style></head><body>${data.page.html}` +
      `<script>${data.page.js || ''}<` + '/script></body></html>'
  }, [data])

  if (error) return <div className="page" style={{ maxWidth: 720 }}><div className="error">{error}</div></div>
  if (!params) return <div className="page" style={{ maxWidth: 720 }}><p className="muted">Chargement du paiement…</p></div>

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      {preview && <div className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
        <iframe title="Page de vente importée" sandbox="allow-scripts allow-forms allow-popups" srcDoc={preview} style={{ width: '100%', minHeight: 420, border: 0 }} />
      </div>}
      <PublicPaymentCheckout funnelSlug={params.funnel} tariffSlug={params.tarif} />
    </div>
  )
}
