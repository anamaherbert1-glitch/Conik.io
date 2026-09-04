'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage(''); setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` } })
    if (error) setError(error.message)
    else if (data.session) window.location.href = '/onboarding'
    else setMessage('Consultez votre boîte mail pour confirmer votre compte, puis poursuivez la configuration.')
    setLoading(false)
  }
  return <main className="auth-page"><div className="auth-card"><Link href="/" className="brand">CONIK<span>.io</span></Link><h1>Créer votre compte</h1><p>Commencez à construire votre espace de travail marketing.</p><form onSubmit={submit}><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label><label>Mot de passe<input type="password" required minLength={8} value={password} onChange={e=>setPassword(e.target.value)} /></label>{error && <div className="error">{error}</div>}{message && <div className="success">{message}</div>}<button className="primary full" disabled={loading}>{loading ? 'Création…' : 'Créer un compte'}</button></form><p className="auth-footer">Vous avez déjà un compte ? <Link href="/login">Se connecter</Link></p></div></main>
}
