'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth/messages'

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [next, setNext] = useState('/dashboard')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setNext(safeNext(params.get('next')))
    const rawError = params.get('error')
    const reset = params.get('reset')
    if (rawError) setError(authErrorMessage(rawError))
    if (reset === 'success') setInfo('Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.')
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setInfo('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Saisissez votre adresse e-mail.')
      return
    }
    if (!password) {
      setError('Saisissez votre mot de passe.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (loginError) {
        setError(authErrorMessage(loginError.message))
        return
      }

      window.location.replace(next)
    } catch (e) {
      setError(authErrorMessage(e instanceof Error ? e.message : ''))
    } finally {
      setLoading(false)
    }
  }

  async function loginWithGoogle() {
    setError('')
    setInfo('')
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      const origin = window.location.origin
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: origin + '/auth/callback?next=' + encodeURIComponent(next),
          queryParams: { prompt: 'select_account' },
        },
      })
      if (oauthError) setError(authErrorMessage(oauthError.message))
    } catch (e) {
      setError(authErrorMessage(e instanceof Error ? e.message : ''))
    } finally {
      setGoogleLoading(false)
    }
  }

  function goBack() {
    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) router.back()
    else router.push('/')
  }

  return (
    <main className="home-plain">
      <header className="home-top">
        <button type="button" className="outline" onClick={goBack} aria-label="Retour à la page précédente">
          ← Retour
        </button>
        <Link href="/" className="home-brand" aria-label="Conik.io">
          <span className="home-logo">C</span>
          <span>Conik.io</span>
        </Link>
        <Link href="/signup" className="outline" style={{ fontSize: 13, textDecoration: 'none' }}>
          Créer un compte
        </Link>
      </header>

      <section className="home-center">
        <h1 className="home-title" style={{ fontSize: 'clamp(28px,6vw,36px)' }}>Se connecter</h1>
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
            <span>ou avec votre e-mail</span>
          </div>

          <form className="home-form" onSubmit={submit} noValidate>
            <label>
              E-mail
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@email.com"
                aria-invalid={Boolean(error)}
              />
            </label>

            <label>
              Mot de passe
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  style={{ paddingRight: 88 }}
                  aria-invalid={Boolean(error)}
                />
                <button
                  type="button"
                  className="outline"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  style={{ position: 'absolute', right: 6, top: 6, minHeight: 34, padding: '0 10px' }}
                >
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6 }}>
              <Link href="/forgot-password">Mot de passe oublié ?</Link>
            </div>

            {error && <div className="error" role="alert">{error}</div>}
            {info && <div className="auth-ok" role="status">{info}</div>}

            <button type="submit" className="primary full" disabled={loading || googleLoading}>
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <p className="home-switch">
            Pas encore de compte ? <Link href="/signup">Créer un compte</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
