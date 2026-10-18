'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { authErrorMessage } from '@/lib/auth/messages'

function returnToHomeForExistingEmail(email: string) {
  window.location.replace('/?auth=already_registered&email=' + encodeURIComponent(email))
}

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [company, setCompany] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setInfo('')

    const normalizedEmail = email.trim().toLowerCase()
    const cleanFirstName = firstName.trim()
    const cleanLastName = lastName.trim()
    if (!cleanFirstName || !cleanLastName) {
      setError('Saisissez votre nom et votre prénom.')
      return
    }
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
      const supabase = createClient()
      const origin = window.location.origin
      const fullName = [cleanFirstName, cleanLastName].join(' ')
      const { data, error: signupError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
          data: {
            first_name: cleanFirstName,
            last_name: cleanLastName,
            full_name: fullName,
            phone: phone.trim(),
            country: country.trim(),
            city: city.trim(),
            company: company.trim(),
          },
        },
      })

      if (signupError) {
        const message = signupError.message.toLowerCase()
        if (message.includes('already registered') || message.includes('already exists')) {
          returnToHomeForExistingEmail(normalizedEmail)
          return
        }
        setError(authErrorMessage(signupError.message))
        return
      }

      // Supabase may intentionally return an empty identities array for an existing email.
      if (data.user && !data.session && (data.user.identities?.length ?? 0) === 0) {
        returnToHomeForExistingEmail(normalizedEmail)
        return
      }

      if (data.session) {
        window.location.replace('/onboarding')
        return
      }

      setInfo('Inscription enregistrée. Ouvrez le message envoyé à votre adresse e-mail pour la vérifier. Après confirmation, vous pourrez terminer la configuration de votre espace Conik.')
    } catch (e) {
      setError(authErrorMessage(e instanceof Error ? e.message : ''))
    } finally {
      setLoading(false)
    }
  }

  async function signupWithGoogle() {
    setError('')
    setInfo('')
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
        <Link href="/" className="outline" aria-label="Retour à l’accueil">← Retour à l’accueil</Link>
        <Link href="/" className="home-brand" aria-label="Conik.io">
          <span className="home-logo">C</span><span>Conik.io</span>
        </Link>
        <Link href="/login" className="outline" style={{ fontSize: 13, textDecoration: 'none' }}>Connexion</Link>
      </header>

      <section className="home-center">
        <h1 className="home-title" style={{ fontSize: 'clamp(28px,6vw,36px)' }}>Créer un compte</h1>
        <p className="home-desc">Créez votre espace Conik en quelques secondes.</p>

        <div className="home-form-wrap">
          <button type="button" className="outline full conik-google-btn" onClick={() => void signupWithGoogle()} disabled={googleLoading || loading}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l.1.1 6.3 5.3C36.9 39.2 44 34 44 24c0-1.3-.1-2.5-.4-3.5z" />
            </svg>
            {googleLoading ? 'Redirection…' : 'Continuer avec Google'}
          </button>

          <div className="auth-divider" aria-hidden="true"><span>ou avec votre e-mail</span></div>

          <form className="home-form" onSubmit={submit} noValidate>
            <div className="signup-name-grid">
              <label>Prénom
                <input required autoComplete="given-name" maxLength={80} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Votre prénom" />
              </label>
              <label>Nom
                <input required autoComplete="family-name" maxLength={80} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Votre nom" />
              </label>
            </div>
            <label>Adresse e-mail
              <input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@email.com" aria-invalid={Boolean(error)} />
            </label>
            <label>Téléphone (facultatif)
              <input type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+228 ..." />
            </label>
            <div className="signup-name-grid">
              <label>Pays (facultatif)
                <input autoComplete="country-name" value={country} onChange={e => setCountry(e.target.value)} placeholder="Togo" />
              </label>
              <label>Ville (facultatif)
                <input autoComplete="address-level2" value={city} onChange={e => setCity(e.target.value)} placeholder="Lomé" />
              </label>
            </div>
            <label>Entreprise ou activité (facultatif)
              <input autoComplete="organization" value={company} onChange={e => setCompany(e.target.value)} placeholder="Nom de votre entreprise" />
            </label>
            <label>Mot de passe
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Au moins 8 caractères" style={{ paddingRight: 88 }} aria-describedby="signup-password-help" />
                <button type="button" className="outline" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} style={{ position: 'absolute', right: 6, top: 6, minHeight: 34, padding: '0 10px' }}>{showPassword ? 'Masquer' : 'Afficher'}</button>
              </div>
              <small id="signup-password-help" className="hint">8 caractères minimum.</small>
            </label>
            <label>Confirmer le mot de passe
              <div style={{ position: 'relative' }}>
                <input type={showConfirm ? 'text' : 'password'} required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Répétez le mot de passe" style={{ paddingRight: 88 }} />
                <button type="button" className="outline" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Masquer la confirmation' : 'Afficher la confirmation'} style={{ position: 'absolute', right: 6, top: 6, minHeight: 34, padding: '0 10px' }}>{showConfirm ? 'Masquer' : 'Afficher'}</button>
              </div>
            </label>

            {error && <div className="error" role="alert">{error}</div>}
            {info && <div className="auth-ok" role="status">{info}<div style={{ marginTop: 12 }}><Link href="/login">Aller à la connexion</Link></div></div>}
            <button type="submit" className="primary full" disabled={loading || googleLoading}>{loading ? 'Création du compte…' : 'Terminer mon inscription'}</button>
          </form>
          <p className="home-switch">Déjà un compte ? <Link href="/login">Se connecter</Link></p>
        </div>
      </section>
    </main>
  )
}
