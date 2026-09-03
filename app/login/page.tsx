'use client'

import { FormEvent, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const ALLOWED_EMAILS = new Set([
  'eliteone003@gmail.com',
  'anamaspenser@gmail.com',
])

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    if (!ALLOWED_EMAILS.has(normalizedEmail)) {
      setError('Access denied. This email is not authorized.')
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
        setError('Incorrect email or access code.')
        return
      }

      window.location.replace(safeNext(searchParams.get('next')))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="brand">CONIK<span>.io</span></Link>
        <h1>Welcome to Conik</h1>
        <p>Enter your authorized email and access code to continue.</p>

        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
            />
          </label>

          <label>
            Access code
            <input
              type="password"
              required
              autoComplete="current-password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Enter your access code"
            />
          </label>

          {error && <div className="error">{error}</div>}

          <button className="primary full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer">Authorized access only.</p>
      </div>
    </main>
  )
}
