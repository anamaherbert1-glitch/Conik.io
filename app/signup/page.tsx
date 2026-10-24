'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePreferences } from '@/components/preferences-provider'
import { locales, type Locale, type Theme } from '@/lib/i18n/dictionaries'
import { signOut } from '@/app/actions/auth'
import { authErrorMessage } from '@/lib/auth/messages'

export default function SignupPage() {
  const router = useRouter()
  const { theme, setTheme, locale, setLocale, dict } = usePreferences()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    const prefill = new URLSearchParams(window.location.search).get('email')
    if (prefill) {
      setEmail(prefill)
      setShowEmailForm(true)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  function goBack() {
    if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) router.back()
    else router.push('/')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Saisissez une adresse e-mail valide.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }

    setLoading(true)
    try {
      const create = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      })
      const created = await create.json().catch(() => ({}))

      if (create.status === 409 || created.error === 'already_registered') {
        window.location.replace('/login?email=' + encodeURIComponent(normalizedEmail) + '&error=' + encodeURIComponent('Un compte existe déjà. Connectez-vous.'))
        return
      }
      if (!create.ok) {
        setError(authErrorMessage(created.error || created.message || 'Inscription impossible.'))
        return
      }

      const supabase = createClient()
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })
      if (loginError) {
        setError(authErrorMessage(loginError.message))
        return
      }

      // Bootstrap espace puis dashboard (pas de formulaire profil)
      window.location.replace('/onboarding')
    } catch (e) {
      setError(authErrorMessage(e instanceof Error ? e.message : ''))
    } finally {
      setLoading(false)
    }
  }

  async function signupWithGoogle() {
    setError('')
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      const origin = window.location.origin
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=/onboarding`,
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

  return (
    <main className="home-plain">
      <header className="home-top">
        <button type="button" className="outline" onClick={goBack} aria-label="Retour à la page précédente">
          ← Retour à l’accueil
        </button>

        <Link href="/" className="home-brand" aria-label="Conik.io">
          <span className="home-logo">C</span>
          <span>Conik.io</span>
        </Link>

        <Link href="/login" className="outline" style={{ fontSize: 13, textDecoration: 'none' }}>
          Se connecter
        </Link>
      </header>

      <section className="home-center">
        <h1 className="home-title" style={{ fontSize: 'clamp(28px,6vw,36px)' }}>S’inscrire</h1>
        <p className="home-desc">Créez votre compte avec Google ou votre e-mail, puis accédez directement à Conik.</p>

        <div className="home-form-wrap">
          <button
            type="button"
            className="outline full conik-google-btn"
            onClick={() => void signupWithGoogle()}
            disabled={googleLoading || loading}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l.1.1 6.3 5.3C36.9 39.2 44 34 44 24c0-1.3-.1-2.5-.4-3.5z" />
            </svg>
            {googleLoading ? 'Redirection…' : 'S’inscrire avec Google'}
          </button>

          {!showEmailForm && (
            <button type="button" className="primary full" onClick={() => setShowEmailForm(true)}>
              S’inscrire avec mon e-mail
            </button>
          )}

          {showEmailForm && (
            <>
              <button
                type="button"
                className="outline full"
                onClick={() => { setShowEmailForm(false); setError('') }}
              >
                ← Retour aux choix d’inscription
              </button>
              <div className="auth-divider" aria-hidden="true">
                <span>ou avec votre e-mail</span>
              </div>

              <form className="home-form" onSubmit={submit} noValidate>
                <label>
                  Adresse e-mail
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
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
                      minLength={8}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Au moins 8 caractères"
                      style={{ paddingRight: 88 }}
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
                  <small className="hint">8 caractères minimum.</small>
                </label>

                <label>
                  Confirmer le mot de passe
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Répétez le mot de passe"
                      style={{ paddingRight: 88 }}
                    />
                    <button
                      type="button"
                      className="outline"
                      onClick={() => setShowConfirm((value) => !value)}
                      style={{ position: 'absolute', right: 6, top: 6, minHeight: 34, padding: '0 10px' }}
                    >
                      {showConfirm ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                </label>

                {error && <div className="error" role="alert">{error}</div>}

                <button type="submit" className="primary full" disabled={loading || googleLoading}>
                  {loading ? 'Création…' : 'Créer mon compte'}
                </button>
              </form>
            </>
          )}

          <p className="home-switch">
            Déjà un compte ? <Link href="/login">Se connecter</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
