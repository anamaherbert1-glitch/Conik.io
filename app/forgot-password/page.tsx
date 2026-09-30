'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth/messages'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSuccess(false)

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Saisissez votre adresse e-mail.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })

      // Do not reveal whether an account exists. Supabase intentionally treats
      // recovery as a generic email flow.
      if (resetError) {
        setError(authErrorMessage(resetError.message))
        return
      }
      setSuccess(true)
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
        <button type="button" className="outline" onClick={() => router.back()}>
          Retour
        </button>
      </header>

      <section className="home-center">
        <h1 className="home-title" style={{ fontSize: 'clamp(28px,6vw,36px)' }}>Mot de passe oublié</h1>
        <p className="home-desc">
          Entrez votre adresse e-mail et nous vous enverrons un lien pour créer un nouveau mot de passe.
        </p>

        <div className="home-form-wrap">
          {success ? (
            <div className="auth-ok" role="status">
              <strong>Vérifiez votre boîte e-mail.</strong>
              <br />
              Si cette adresse correspond à un compte Conik, vous recevrez un lien de réinitialisation.
              <div style={{ marginTop: 16 }}>
                <Link href="/login" className="primary full" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                  Retour à la connexion
                </Link>
              </div>
            </div>
          ) : (
            <form className="home-form" onSubmit={submit} noValidate>
              <label>
                E-mail
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

              {error && <div className="error" role="alert">{error}</div>}

              <button type="submit" className="primary full" disabled={loading}>
                {loading ? 'Envoi…' : 'Envoyer le lien'}
              </button>

              <Link href="/login" className="outline full" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Retour à la connexion
              </Link>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
