'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type Status = 'pending' | 'processing' | 'paid' | 'succeeded' | 'failed' | 'refunded' | 'cancelled' | string

type Delivery = {
  access_token?: string
  product_slug?: string
  product_name?: string
  file_url?: string
  video_url?: string
  course_url?: string
  instructions?: string
  success_message?: string | null
}

type Result = {
  order?: {
    order_number: string
    status: Status
    total_amount: number
    currency: string
    product_label?: string | null
    paid_at?: string | null
  }
  transaction?: { status: Status; method_code?: string | null; provider_transaction_id?: string | null }
  delivery?: Delivery | null
  error?: string
}

function PaymentResultInner() {
  const params = useSearchParams()
  const order = params.get('order') || ''
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!order) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const poll = async () => {
      try {
        const response = await fetch(`/api/payments/status?order=${encodeURIComponent(order)}`, { cache: 'no-store' })
        const json = await response.json()
        if (stopped) return
        if (!response.ok) throw new Error(json.error || 'Impossible de récupérer le statut du paiement.')
        setResult(json)
        const status = String(json?.transaction?.status || json?.order?.status || '').toLowerCase()
        if (!['succeeded', 'paid', 'failed', 'refunded', 'cancelled'].includes(status)) timer = setTimeout(poll, 2500)
      } catch (e) {
        if (!stopped) setError(e instanceof Error ? e.message : 'Erreur de statut')
      }
    }

    poll()
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [order])

  const status = String(result?.transaction?.status || result?.order?.status || 'pending').toLowerCase()
  const success = status === 'succeeded' || status === 'paid'
  const failed = status === 'failed' || status === 'cancelled'
  const refunded = status === 'refunded'
  const delivery = result?.delivery

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#f7f8fa',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <section
        style={{
          width: 'min(520px,100%)',
          background: '#fff',
          borderRadius: 20,
          padding: 28,
          boxShadow: '0 12px 40px rgba(0,0,0,.08)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>{success ? '✓' : failed ? '×' : refunded ? '↩' : '…'}</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 26 }}>
          {success
            ? 'Paiement confirmé'
            : failed
              ? 'Paiement échoué'
              : refunded
                ? 'Paiement remboursé'
                : 'Paiement en cours'}
        </h1>
        {error ? (
          <p style={{ color: '#b42318' }}>{error}</p>
        ) : result?.order ? (
          <>
            <p style={{ color: '#667085' }}>{result.order.product_label || 'Paiement Conik'}</p>
            <strong style={{ fontSize: 24 }}>
              {result.order.total_amount} {result.order.currency}
            </strong>
            <p style={{ color: '#667085', fontSize: 14 }}>Commande : {result.order.order_number}</p>
            {!success && !failed && !refunded && (
              <p style={{ color: '#667085' }}>Nous vérifions automatiquement le paiement auprès du prestataire…</p>
            )}

            {success && delivery && (
              <div
                style={{
                  marginTop: 24,
                  padding: 16,
                  borderRadius: 14,
                  background: '#ecfdf5',
                  textAlign: 'left',
                  color: '#065f46',
                }}
              >
                <strong style={{ display: 'block', marginBottom: 8 }}>
                  {delivery.product_name || 'Votre produit est disponible'}
                </strong>
                {delivery.success_message && <p style={{ margin: '0 0 10px', fontSize: 14 }}>{delivery.success_message}</p>}
                {delivery.instructions && <p style={{ margin: '0 0 12px', fontSize: 13, color: '#047857' }}>{delivery.instructions}</p>}
                <div style={{ display: 'grid', gap: 8 }}>
                  {delivery.file_url && (
                    <a
                      href={delivery.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'block',
                        textAlign: 'center',
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: '#065f46',
                        color: '#fff',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      Télécharger mon produit
                    </a>
                  )}
                  {delivery.video_url && (
                    <a href={delivery.video_url} target="_blank" rel="noopener noreferrer" style={linkBtn}>
                      Accéder à la vidéo
                    </a>
                  )}
                  {delivery.course_url && (
                    <a href={delivery.course_url} target="_blank" rel="noopener noreferrer" style={linkBtn}>
                      Ouvrir la formation
                    </a>
                  )}
                  {delivery.product_slug && delivery.access_token && (
                    <a
                      href={`/p/${delivery.product_slug}/access?token=${encodeURIComponent(delivery.access_token)}`}
                      style={{ ...linkBtn, background: '#fff', color: '#065f46', border: '1px solid #a7f3d0' }}
                    >
                      Page d’accès permanente
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <p style={{ color: '#667085' }}>Vérification du paiement…</p>
        )}
      </section>
    </main>
  )
}

const linkBtn: React.CSSProperties = {
  display: 'block',
  textAlign: 'center',
  padding: '12px 14px',
  borderRadius: 10,
  background: '#047857',
  color: '#fff',
  fontWeight: 700,
  textDecoration: 'none',
  fontSize: 14,
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <main
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            background: '#f7f8fa',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <p style={{ color: '#667085' }}>Chargement…</p>
        </main>
      }
    >
      <PaymentResultInner />
    </Suspense>
  )
}
