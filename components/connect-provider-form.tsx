'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Link2, UserPlus, KeyRound, Copy, Check } from 'lucide-react'
import type { GatewayDef } from '@/lib/payment-gateways'
import { OFFICIAL_PAYMENT_LOGOS } from '@/lib/payment-provider-logos'

export function ConnectProviderForm({ gateway }: { gateway: GatewayDef }) {
  const router = useRouter()
  const [step, setStep] = useState<'choice' | 'credentials'>('choice')
  const [label, setLabel] = useState('')
  const [creds, setCreds] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://conik-io.vercel.app'
  const webhookUrl = `${origin}/api/payments/webhooks/${gateway.id}`

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/payments/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: gateway.id,
          label: label.trim() || gateway.name,
          credentials: creds,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Impossible de connecter')
      router.push('/integrations')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <Link href="/integrations" className="back" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <ArrowLeft size={15} />
        Passerelles de paiement
      </Link>

      <div className="panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: gateway.bg,
              display: 'grid',
              placeItems: 'center',
              padding: 10,
              overflow: 'hidden',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={OFFICIAL_PAYMENT_LOGOS[gateway.id] || gateway.logoUrl}
              alt={gateway.name}
              style={{ maxWidth: '100%', maxHeight: 44, objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const sib = e.currentTarget.nextElementSibling as HTMLElement | null
                if (sib) sib.style.display = 'grid'
              }}
            />
            <span
              style={{
                display: 'none',
                placeItems: 'center',
                width: '100%',
                height: '100%',
                fontWeight: 800,
                color: gateway.color,
                fontSize: 18,
              }}
            >
              {gateway.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, color: gateway.color }}>{gateway.name}</h1>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              {gateway.countries}
            </p>
          </div>
        </div>

        {step === 'choice' && (
          <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Avez-vous déjà un compte {gateway.name} ?</p>

            <button
              type="button"
              className="primary"
              style={{ width: '100%', justifyContent: 'center', minHeight: 48 }}
              onClick={() => setStep('credentials')}
            >
              <KeyRound size={16} />
              Oui — j’ai un compte, connecter
            </button>

            <a
              className="outline"
              href={gateway.signupUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                width: '100%',
                justifyContent: 'center',
                minHeight: 48,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
              }}
            >
              <UserPlus size={16} />
              Non — créer un compte sur {gateway.name}
              <ExternalLink size={14} />
            </a>
          </div>
        )}

        {step === 'credentials' && (
          <form onSubmit={save} style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            <p style={{ margin: 0, fontSize: 13 }} className="muted">
              {gateway.credentialsHelp}
            </p>

            <label className="form-label">
              Nom d’affichage dans Conik
              <input
                className="form-input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={`Mon compte ${gateway.name}`}
              />
            </label>

            {gateway.fields.map((f) => (
              <label key={f.key} className="form-label">
                {f.label}
                <input
                  className="form-input"
                  type={f.secret ? 'password' : 'text'}
                  value={creds[f.key] || ''}
                  onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  autoComplete="off"
                  required={f.key !== 'secret_key' && f.key !== 'encryption_key' && f.key !== 'api_secret' && f.key !== 'client_secret'}
                />
              </label>
            ))}

            <div
              style={{
                fontSize: 12,
                padding: 12,
                borderRadius: 8,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                wordBreak: 'break-all',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Link2 size={13} />
                <b>Webhook Conik à coller chez {gateway.name}</b>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 6 }}>
                <code style={{ fontSize: 12, flex: 1, wordBreak: 'break-all' }}>{webhookUrl}</code>
                <button
                  type="button"
                  className="outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(webhookUrl)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    } catch {
                      /* ignore */
                    }
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                >
                  {copied ? (<><Check size={14} /> Copié</>) : (<><Copy size={14} /> Copier</>)}
                </button>
              </div>
            </div>

            {error && <div className="error">{error}</div>}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="submit" className="primary" disabled={busy} style={{ flex: 1, justifyContent: 'center' }}>
                {busy ? 'Connexion…' : 'Connecter à Conik'}
              </button>
              <button type="button" className="outline" onClick={() => setStep('choice')}>
                Retour
              </button>
            </div>

            <a
              href={gateway.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="muted"
              style={{ fontSize: 12, textAlign: 'center', display: 'block' }}
            >
              Ouvrir le site {gateway.name} <ExternalLink size={12} style={{ verticalAlign: 'middle' }} />
            </a>
          </form>
        )}
      </div>
    </div>
  )
}
