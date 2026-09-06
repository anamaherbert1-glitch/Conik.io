'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_ALLOWED = ['eliteone003@gmail.com', 'anamaspenser@gmail.com']
const ALLOWED_EMAILS = new Set((process.env.NEXT_PUBLIC_ALLOWED_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean).concat(DEFAULT_ALLOWED))

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [next, setNext] = useState('/dashboard')

  useEffect(() => setNext(safeNext(new URLSearchParams(window.location.search).get('next'))), [])

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    const normalizedEmail = email.trim().toLowerCase()
    if (!ALLOWED_EMAILS.has(normalizedEmail)) { setError("Accès refusé. Cette adresse e-mail n'est pas autorisée."); setLoading(false); return }
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: code })
      if (signInError) { setError('E-mail ou code d’accès incorrect.'); return }
      window.location.replace(next)
    } finally { setLoading(false) }
  }

  return <main className="auth-page conik-login-page">
    <div className="auth-orb auth-orb-one" aria-hidden="true" />
    <div className="auth-orb auth-orb-two" aria-hidden="true" />
    <div className="auth-grid-pattern" aria-hidden="true" />
    <section className="auth-card conik-login-card">
      <div className="brand"><b>C</b><strong>Conik.io</strong><small>Marketing OS</small></div>
      <div className="login-kicker">ESPACE PRIVÉ</div>
      <h1>Bienvenue sur Conik</h1>
      <p>Connectez-vous avec une adresse e-mail autorisée et votre code d’accès.</p>
      <form onSubmit={submit}>
        <label>E-mail<input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@email.com" /></label>
        <label>Code d’accès<input type="password" required autoComplete="current-password" value={code} onChange={e => setCode(e.target.value)} placeholder="Votre code d’accès" /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary full login-submit" disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</button>
      </form>
      <p className="auth-footer">Accès réservé aux comptes autorisés.</p>
    </section>
    <style jsx>{`
      .conik-login-page{position:relative;isolation:isolate;overflow:hidden;background:radial-gradient(circle at 12% 18%,rgba(91,92,240,.20),transparent 32%),radial-gradient(circle at 88% 82%,rgba(236,72,153,.12),transparent 30%),linear-gradient(135deg,#f3f4ff 0%,#f8f9fc 48%,#eef0ff 100%);padding:32px 20px}
      .auth-orb{position:absolute;border-radius:999px;filter:blur(1px);pointer-events:none;z-index:-1}
      .auth-orb-one{width:360px;height:360px;left:-150px;top:-110px;background:rgba(91,92,240,.10)}
      .auth-orb-two{width:300px;height:300px;right:-100px;bottom:-80px;background:rgba(124,58,237,.09)}
      .auth-grid-pattern{position:absolute;inset:0;z-index:-1;opacity:.22;background-image:linear-gradient(rgba(91,92,240,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(91,92,240,.08) 1px,transparent 1px);background-size:38px 38px;mask-image:linear-gradient(to bottom,transparent,black 20%,black 80%,transparent)}
      .conik-login-card{position:relative;width:min(440px,100%);padding:36px;border-radius:22px;box-shadow:0 28px 90px rgba(30,34,70,.14);backdrop-filter:blur(10px)}
      .login-kicker{display:inline-flex;margin:0 0 8px;padding:5px 9px;border-radius:999px;background:#f0efff;color:#4f46e5;font-size:9px;font-weight:800;letter-spacing:.12em}
      .conik-login-card h1{margin:4px 0 8px;font-size:29px}.conik-login-card>p{margin-bottom:25px}
      .login-submit{min-height:46px;margin-top:2px;background:#5b5cf0}.conik-login-card .brand{margin-bottom:24px}
      @media(max-width:520px){.conik-login-page{padding:20px 14px}.conik-login-card{padding:27px 20px;border-radius:18px}.conik-login-card h1{font-size:25px}.auth-orb-one{width:260px;height:260px}.auth-orb-two{width:220px;height:220px}}
    `}</style>
  </main>
}
