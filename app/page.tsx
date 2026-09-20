'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { usePreferences } from '@/components/preferences-provider'
import { locales, type Locale, type Theme } from '@/lib/i18n/dictionaries'
import { signOut } from '@/app/actions/auth'

export default function HomePage() {
  const { theme, setTheme, locale, setLocale, dict } = usePreferences()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSessionEmail(session?.user?.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpen])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setInfo('')
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const origin = window.location.origin
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: name.trim() || undefined },
          emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
        },
      })
      if (signUpError) {
        setError(signUpError.message || 'Inscription impossible.')
        return
      }
      if (data.session) {
        window.location.replace('/onboarding')
        return
      }
      setInfo('Compte créé. Vérifiez votre e-mail pour confirmer, puis connectez-vous.')
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
        options: { redirectTo: `${origin}/auth/callback?next=/onboarding` },
      })
      if (oauthError) setError(oauthError.message || 'Inscription Google impossible.')
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

        <div className="home-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="home-burger"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          {menuOpen && (
            <div className="home-menu" role="menu">
              {sessionEmail ? (
                <>
                  <div className="home-menu-label">{sessionEmail}</div>
                  <Link href="/dashboard" className="home-menu-item" onClick={() => setMenuOpen(false)}>
                    Tableau de bord
                  </Link>
                  <form action={signOut}>
                    <button type="submit" className="home-menu-item">
                      {dict.nav.Logout}
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="home-menu-item" onClick={() => setMenuOpen(false)}>
                  Connexion
                </Link>
              )}

              <div className="home-menu-sep" />
              <div className="home-menu-label">Thème</div>
              {(
                [
                  ['system', 'Système'],
                  ['light', 'Clair'],
                  ['dark', 'Sombre'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`home-menu-item ${theme === value ? 'active' : ''}`}
                  onClick={() => setTheme(value as Theme)}
                >
                  {label}
                </button>
              ))}

              <div className="home-menu-sep" />
              <div className="home-menu-label">Langue</div>
              {locales.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className={`home-menu-item ${locale === l.code ? 'active' : ''}`}
                  onClick={() => setLocale(l.code as Locale)}
                >
                  {l.native}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <section className="home-center">
        <h1 className="home-title">Conik.io</h1>
        <p className="home-desc">
          Créez, publiez et monétisez vos tunnels de vente — simplement, depuis un seul espace.
        </p>

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
            {googleLoading ? 'Redirection…' : 'Continuer avec Google'}
          </button>

          <div className="auth-divider" aria-hidden="true">
            <span>ou par e-mail</span>
          </div>

          <form className="home-form" onSubmit={submit}>
            <label>
              Nom (optionnel)
              <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" />
            </label>
            <label>
              E-mail
              <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@email.com" />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Au moins 6 caractères"
              />
            </label>
            {error && <div className="error">{error}</div>}
            {info && <div className="auth-ok">{info}</div>}
            <button type="submit" className="primary full" disabled={loading || googleLoading}>
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>

          <p className="home-switch">
            Déjà un compte ? <Link href="/login">Se connecter</Link>
          </p>
        </div>
      </section>
    </main>
  )
}
