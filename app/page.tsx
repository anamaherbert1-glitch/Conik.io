'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage(''); setLoading(true)
    try {
      const supabase = createClient(); const normalizedEmail = email.trim().toLowerCase()
      const { data, error: signUpError } = await supabase.auth.signUp({ email: normalizedEmail, password, options: { emailRedirectTo: `${window.location.origin}/onboarding` } })
      if (signUpError) { setError(signUpError.message); return }
      if (data.session) { window.location.replace('/onboarding'); return }
      setMessage('Compte créé. Vérifiez votre e-mail si une confirmation est requise, puis connectez-vous.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Inscription impossible.') }
    finally { setLoading(false) }
  }

  return <main className="auth-page"><div className="auth-card">
    <Link href="/" className="brand"><b>C</b><strong>Conik.io</strong><small>Marketing OS</small></Link>
    <h1>Créer un compte</h1><p>Inscrivez-vous pour lancer vos tunnels, contacts et campagnes.</p>
    <form onSubmit={submit}><label>E-mail<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@email.com" /></label><label>Mot de passe<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Au moins 8 caractères" /></label>{error && <div className="error">{error}</div>}{message && <div className="success">{message}</div>}<button className="primary full" disabled={loading}>{loading ? 'Création…' : "S'inscrire"}</button></form>
    <p className="auth-footer">Déjà un compte ? <Link href="/login">Se connecter</Link></p>
  </div></main>
}
