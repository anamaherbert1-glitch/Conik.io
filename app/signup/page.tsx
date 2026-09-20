'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

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
      setInfo('Compte créé. Vérifiez votre e-mail pour confirmer l’inscription, puis connectez-vous.')
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
        },
      })
      if (oauthError) setError(oauthError.message || 'Inscription Google impossible.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div>
          <Link href="/" className="land-brand">
            <span className="land-logo">C</span>
            <span>
              <strong>Conik.io</strong>
              <small>Marketing OS</small>
            </span>
          </Link>
          <h2>Lancez votre premier tunnel en quelques minutes</h2>
          <p>
            Importez un projet HTML, branchez un prestataire de paiement et publiez — Conik s’occupe du reste.
          </p>
          <ul>
            <li>Inscription gratuite pour démarrer</li>
            <li>Paiements adaptés à l’Afrique</li>
            <li>WhatsApp et analytics intégrés</li>
            <li>Interface claire sur mobile</li>
          </ul>
        </div>
        <p style={{ fontSize: 12, opacity: 0.5 }}>© {new Date().getFullYear()} Conik.io</p>
      </aside>

      <main className="auth-main">
        <div className="auth-box">
          <h1>Créer un compte</h1>
          <p className="muted">Inscrivez-vous avec Google ou votre e-mail.</p>

          <button type="button" className="auth-google" onClick={() => void signupWithGoogle()} disabled={googleLoading || loading}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l.1.1 6.3 5.3C36.9 39.2 44 34 44 24c0-1.3-.1-2.5-.4-3.5z" />
            </svg>
            {googleLoading ? 'Redirection…' : 'Continuer avec Google'}
          </button>

          <div className="auth-divider">ou par e-mail</div>

          <form onSubmit={submit}>
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
              <input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Au moins 6 caractères" />
            </label>
            {error && <div className="auth-error">{error}</div>}
            {info && <div className="auth-ok">{info}</div>}
            <button type="submit" className="land-btn solid full" disabled={loading || googleLoading}>
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>

          <p className="auth-switch">
            Déjà un compte ? <Link href="/login">Se connecter</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
