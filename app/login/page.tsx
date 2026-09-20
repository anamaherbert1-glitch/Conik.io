'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

/**
 * Liste blanche des e-mails autorisés.
 * Configurable via NEXT_PUBLIC_ALLOWED_EMAILS (adresses séparées par des virgules).
 * Il ne s'agit que d'un garde-fou d'interface : la sécurité réelle repose sur
 * les politiques RLS de Supabase.
 */
const DEFAULT_ALLOWED = ['eliteone003@gmail.com', 'anamaspenser@gmail.com']

const ALLOWED_EMAILS = new Set(
  (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .concat(DEFAULT_ALLOWED)
)

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [next, setNext] = useState('/dashboard')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setNext(safeNext(params.get('next')))
    const oauthError = params.get('error')
    if (oauthError) setError(oauthError)
  }, [])

  async function signInWithGoogle() {
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const redirectTo = new URL('/auth/callback', window.location.origin)
      redirectTo.searchParams.set('next', next)

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo.toString(),
        },
      })

      if (signInError) setError(signInError.message)
    } finally {
      setLoading(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const normalizedEmail = email.trim().toLowerCase()
    if (!ALLOWED_EMAILS.has(normalizedEmail)) {
      setError("Accès refusé. Cette adresse e-mail n'est pas autorisée.")
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: code,
      })
      if (signInError) {
        setError("E-mail ou code d'accès incorrect.")
        return
      }
      window.location.replace(next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="brand">
          <b>C</b>
          <strong>Conik.io</strong>
          <small>Marketing OS</small>
        </Link>
        <h1>Bienvenue sur Conik</h1>
        <p>Connectez-vous ou créez votre compte avec Google, ou utilisez votre code d&apos;accès.</p>

        <button
          className="outline full"
          type="button"
          disabled={loading}
          onClick={signInWithGoogle}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.22Z"/>
            <path fill="#34A853" d="M12 21.6c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.93-3.31.93-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.6Z"/>
            <path fill="#FBBC05" d="M6.53 13.7A5.85 5.85 0 0 1 6.22 12c0-.59.11-1.17.31-1.7V7.77H3.28A9.74 9.74 0 0 0 2.25 12c0 1.53.37 2.98 1.03 4.23l3.25-2.53Z"/>
            <path fill="#EA4335" d="M12 6.27c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.31 14.63 2.4 12 2.4a9.74 9.74 0 0 0-8.72 5.37l3.25 2.53C7.3 7.99 9.46 6.27 12 6.27Z"/>
          </svg>
          {loading ? 'Connexion…' : 'Continuer avec Google'}
        </button>

        <div className="auth-divider" aria-hidden="true"><span>ou</span></div>

        <form onSubmit={submit}>
          <label>
            E-mail
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@email.com"
            />
          </label>
          <label>
            Code d&apos;accès
            <input
              type="password"
              required
              autoComplete="current-password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Votre code d'accès"
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary full" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p className="auth-footer">Accès réservé aux comptes autorisés.</p>
      </div>
    </main>
  )
}
