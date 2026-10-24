'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Plus de formulaire profil : on crée l’espace automatiquement puis dashboard.
 */
export default function OnboardingPage() {
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Préparation de votre espace…')

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          window.location.replace('/login')
          return
        }

        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

        if (membership) {
          window.location.replace('/dashboard')
          return
        }

        if (!cancelled) setStatus('Création de votre espace Conik…')

        const res = await fetch('/api/auth/bootstrap', { method: 'POST' })
        const json = await res.json().catch(() => ({}))

        if (!res.ok) {
          throw new Error(json.error || 'Impossible de créer votre espace.')
        }

        window.location.replace('/dashboard')
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Impossible de créer votre espace.')
        setStatus('')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {!error && (
          <>
            <div className="step">CONIK</div>
            <h1 style={{ fontSize: 22 }}>Un instant…</h1>
            <p className="muted">{status}</p>
          </>
        )}
        {error && (
          <>
            <div className="error" role="alert" style={{ marginBottom: 16 }}>
              {error}
            </div>
            <p className="muted" style={{ marginBottom: 16 }}>
              Réessayez, ou connectez-vous avec un autre compte.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              <button
                type="button"
                className="primary full"
                onClick={() => {
                  setError('')
                  setStatus('Nouvelle tentative…')
                  window.location.reload()
                }}
              >
                Réessayer
              </button>
              <Link href="/login" className="outline full" style={{ textDecoration: 'none' }}>
                Se connecter
              </Link>
              <Link href="/signup" className="outline full" style={{ textDecoration: 'none' }}>
                S’inscrire
              </Link>
              <Link href="/" className="outline full" style={{ textDecoration: 'none' }}>
                Retour à l’accueil
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
