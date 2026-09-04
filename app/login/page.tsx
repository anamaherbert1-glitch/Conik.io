'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

/**
 * Liste blanche des e-mails autorisés.
 * Configurable via NEXT_PUBLIC_ALLOWED_EMAILS (adresses séparées par des virgules).
 * Il ne s'agit que d'un garde-fou d'interface : la sécurité réelle repose sur
 * les politiques RLS de Supabase.
 */
const DEFAULT_ALLOWED = ['eliteone003@gmail.com', 'anamaspenser@gmail.com']

const ALLOWED_EMAILS = new Set(
  (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .concat(DEFAULT_ALLOWED)
)

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

  useEffect(() => {
    setNext(safeNext(new URLSearchParams(window.location.search).get('next')))
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    const normalizedEmail = email.trim().toLowerCase()
    if (!ALLOWED_EMAILS.has(normalizedEmail)) {
      setError("Accès refusé. Cette adresse e-mail n'est pas autorisée.")
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: code,
      })
      if (signInError) {
        setError("E-mail ou code d'accès incorrect.")
        return
      }
      window.location.replace(next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="brand">
          CONIK<span>.io</span>
        </Link>
        <h1>Bienvenue sur Conik</h1>
        <p>Saisissez votre e-mail autorisé et votre code d&apos;accès pour continuer.</p>
        <form onSubmit={submit}>
          <label>
            E-mail
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@email.com"
            />
          </label>
          <label>
            Code d&apos;accès
            <input
              type="password"
              required
              autoComplete="current-password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Votre code d'accès"
            />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary full" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p className="auth-footer">Accès réservé aux comptes autorisés.</p>
      </div>
    </main>
  )
}
