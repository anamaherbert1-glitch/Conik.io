'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth/messages'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let active = true
    async function checkSession() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      if (!user) {
        setError('Ce lien de réinitialisation est invalide ou a expiré.')
        setReady(false)
        return
      }
      setReady(true)
    }
    void checkSession()
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

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
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(authErrorMessage(updateError.message))
        return
      }
      setSuccess(true)
      setTimeout(() => router.replace('/login?reset=success'), 900)
    } catch (e) {
      setError(authErrorMessage(e instanceof Error ? e.message : ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="home-plain">
      <header className="home-top">
        <Link href="/" className="home-brand" aria-label="Retour à l'accueil Conik.io">
          <span className="home-logo">C</span>
          <span>Conik.io</span>
        </Link>
        <Link href="/login" className="outline" style={{ textDecoration: 'none' }}>
          Retour à la connexion
        </Link>
      </header>

      <section className="home-center">
        <h1 className="home-title" style={{ fontSize: 'clamp(28px,6vw,36px)' }}>Nouveau mot de passe</h1>
        <p className="home-desc">
          Choisissez un nouveau mot de passe sécurisé pour votre compte.
        </p>

        <div className="home-form-wrap">
          {!ready && !success ? (
            <div>
              {error && <div className="error" role="alert">{error}</div>}
              <Link href="/forgot-password" className="primary full" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 12 }}>
                Demander un nouveau lien
              </Link>
            </div>
          ) : success ? (
            <div className="auth-ok" role="status">
              Mot de passe mis à jour. Redirection vers la connexion…
            </div>
          ) : (
            <form className="home-form" onSubmit={submit} noValidate>
              <label>
                Nouveau mot de passe
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
                    aria-describedby="password-help"
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
                <small id="password-help" className="hint">8 caractères minimum.</small>
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
                    aria-label={showConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                    style={{ position: 'absolute', right: 6, top: 6, minHeight: 34, padding: '0 10px' }}
                  >
                    {showConfirm ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
              </label>

              {error && <div className="error" role="alert">{error}</div>}

              <button type="submit" className="primary full" disabled={loading}>
                {loading ? 'Mise à jour…' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
