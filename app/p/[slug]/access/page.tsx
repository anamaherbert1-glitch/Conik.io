'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type AccessPayload = {
  product: { name: string; product_type: string }
  delivery: {
    file_url?: string
    video_url?: string
    course_url?: string
    instructions?: string
  }
  success_message?: string | null
  status: string
}

function AccessInner() {
  const params = useParams()
  const search = useSearchParams()
  const slug = String(params.slug || '')
  const token = search.get('token') || ''

  const [data, setData] = useState<AccessPayload | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug || !token) {
      setError('Lien d’accès invalide.')
      return
    }
    fetch(`/api/products/access?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error || 'Accès refusé')
        setData(j)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))
  }, [slug, token])

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <h1 style={s.title}>Accès indisponible</h1>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={s.page}>
        <p style={{ color: '#fff', opacity: 0.7 }}>Vérification de l’accès…</p>
      </div>
    )
  }

  const d = data.delivery || {}

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.kicker}>ACCÈS PRODUIT</div>
        <h1 style={s.title}>{data.product.name}</h1>
        {data.success_message && <p>{data.success_message}</p>}
        {d.instructions && <p style={{ color: '#475569' }}>{d.instructions}</p>}

        <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
          {d.file_url && (
            <a href={d.file_url} target="_blank" rel="noopener noreferrer" style={s.btn}>
              Télécharger le fichier
            </a>
          )}
          {d.video_url && (
            <a href={d.video_url} target="_blank" rel="noopener noreferrer" style={s.btn}>
              Accéder à la vidéo
            </a>
          )}
          {d.course_url && (
            <a href={d.course_url} target="_blank" rel="noopener noreferrer" style={s.btn}>
              Ouvrir l’espace de formation
            </a>
          )}
          {!d.file_url && !d.video_url && !d.course_url && (
            <p style={{ color: '#64748b' }}>
              {data.status === 'pending'
                ? 'Votre paiement est en cours de confirmation. Rechargez cette page dans quelques instants.'
                : 'Aucun contenu de livraison n’a encore été configuré pour ce produit.'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProductAccessPage() {
  return (
    <Suspense fallback={<div style={s.page}><p style={{ color: '#fff' }}>Chargement…</p></div>}>
      <AccessInner />
    </Suspense>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, background: '#0f172a', fontFamily: 'system-ui, sans-serif' },
  card: { width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 20px 50px rgba(0,0,0,.35)', color: '#0f172a' },
  kicker: { fontSize: 11, fontWeight: 800, letterSpacing: '.12em', opacity: 0.5 },
  title: { margin: '8px 0 12px', fontSize: 22 },
  btn: { display: 'block', textAlign: 'center', padding: '14px 18px', borderRadius: 12, background: '#0f172a', color: '#fff', fontWeight: 800, textDecoration: 'none' },
}
