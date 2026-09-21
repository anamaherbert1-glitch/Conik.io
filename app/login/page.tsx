'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [next, setNext] = useState('/dashboard')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setNext(safeNext(params.get('next')))
    const err = params.get('error')
    if (err) setError(decodeURIComponent(err))
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const origin = window.location.origin
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: email.trim() ? { login_hint: email.trim().toLowerCase() } : undefined,
        },
      })
      if (oauthError) setError(oauthError.message || 'Connexion Google impossible.')
    } finally {
      setLoading(false)
    }
  }

  async function loginWithGoogle() {
    setError('')
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      const origin = window.location.origin
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })
      if (oauthError) setError(oauthError.message || 'Connexion Google impossible.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <main className="home-plain">
      <header className="home-top">
        <Link href="/" className="home-brand">
          <span className="home-logo">C</span>
          <span>Conik.io</span>
        </Link>
        <Link href="/" className="home-brand" style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>
          Inscription
        </Link>
      </header>

      <section className="home-center">
        <h1 className="home-title" style={{ fontSize: 'clamp(28px,6vw,36px)' }}>Connexion</h1>
        <p className="home-desc">Accédez à votre espace Conik.</p>

        <div className="home-form-wrap">
          <button
            type="button"
            className="outline full conik-google-btn"
            onClick={() => void loginWithGoogle()}
            disabled={googleLoading || loading}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l.1.1 6.3 5.3C36.9 39.2 44 34 44 24c0-1.3-.1-2.5-.4-3.5z" />
            </svg>
            {googleLoading ? 'Redirection…' : 'Continuer avec Google'}
          </button>

          <div className="auth-divider" aria-hidden="true">
            <span>Connexion Google</span>
          </div>

          <form className="home-form" onSubmit={submit}>
            <label>
              E-mail
              <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@email.com" />
            </label>
            <label>
              Mot de passe
              <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Votre mot de passe" />
            </label>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="primary full" disabled={loading || googleLoading}>
              {loading ? 'Redirection vers Google…' : 'Se connecter avec Google'}
            </button>
          </form>

          <p className="home-switch">
            Pas encore de compte ? <Link href="/">S’inscrire</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
