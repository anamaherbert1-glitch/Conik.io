'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else window.location.href = '/dashboard'
    setLoading(false)
  }

  return <main className="auth-page"><div className="auth-card"><Link href="/" className="brand">CONIK<span>.io</span></Link><h1>Welcome back</h1><p>Sign in to manage your funnels and leads.</p><form onSubmit={submit}><label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label><label>Password<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} /></label>{error && <div className="error">{error}</div>}<button className="primary full" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button></form><p className="auth-footer">No workspace yet? <Link href="/signup">Create an account</Link></p></div></main>
}
