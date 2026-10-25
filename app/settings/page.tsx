'use client'

import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { SettingsCollaboration } from '@/components/settings-collaboration'
import { SettingsTutorial } from '@/components/settings-tutorial'
import { usePreferences } from '@/components/preferences-provider'
import { locales, type Locale, type Theme } from '@/lib/i18n/dictionaries'
import { Moon, Sun, Monitor, MessageSquarePlus, User, Building2, Camera, ChevronDown } from 'lucide-react'

type Country = { name: string; code: string; dial: string; flag: string }

const countries: Country[] = [
  { name: 'Togo', code: 'TG', dial: '+228', flag: '\u{1F1F9}\u{1F1EC}' },
  { name: 'B\u00e9nin', code: 'BJ', dial: '+229', flag: '\u{1F1E7}\u{1F1EF}' },
  { name: 'Ghana', code: 'GH', dial: '+233', flag: '\u{1F1EC}\u{1F1ED}' },
  { name: "C\u00f4te d\u2019Ivoire", code: 'CI', dial: '+225', flag: '\u{1F1E8}\u{1F1EE}' },
  { name: 'S\u00e9n\u00e9gal', code: 'SN', dial: '+221', flag: '\u{1F1F8}\u{1F1F3}' },
  { name: 'Burkina Faso', code: 'BF', dial: '+226', flag: '\u{1F1E7}\u{1F1EB}' },
  { name: 'Mali', code: 'ML', dial: '+223', flag: '\u{1F1F2}\u{1F1F1}' },
  { name: 'Niger', code: 'NE', dial: '+227', flag: '\u{1F1F3}\u{1F1EA}' },
  { name: 'Guin\u00e9e', code: 'GN', dial: '+224', flag: '\u{1F1EC}\u{1F1F3}' },
  { name: 'Cameroun', code: 'CM', dial: '+237', flag: '\u{1F1E8}\u{1F1F2}' },
  { name: 'Gabon', code: 'GA', dial: '+241', flag: '\u{1F1EC}\u{1F1E6}' },
  { name: 'Congo', code: 'CG', dial: '+242', flag: '\u{1F1E8}\u{1F1EC}' },
  { name: 'RD Congo', code: 'CD', dial: '+243', flag: '\u{1F1E8}\u{1F1E9}' },
  { name: 'Nigeria', code: 'NG', dial: '+234', flag: '\u{1F1F3}\u{1F1EC}' },
  { name: 'Kenya', code: 'KE', dial: '+254', flag: '\u{1F1F0}\u{1F1EA}' },
  { name: 'Maroc', code: 'MA', dial: '+212', flag: '\u{1F1F2}\u{1F1E6}' },
  { name: 'Alg\u00e9rie', code: 'DZ', dial: '+213', flag: '\u{1F1E9}\u{1F1FF}' },
  { name: 'Tunisie', code: 'TN', dial: '+216', flag: '\u{1F1F9}\u{1F1F3}' },
  { name: 'France', code: 'FR', dial: '+33', flag: '\u{1F1EB}\u{1F1F7}' },
  { name: 'Belgique', code: 'BE', dial: '+32', flag: '\u{1F1E7}\u{1F1EA}' },
  { name: 'Canada', code: 'CA', dial: '+1', flag: '\u{1F1E8}\u{1F1E6}' },
  { name: '\u00c9tats-Unis', code: 'US', dial: '+1', flag: '\u{1F1FA}\u{1F1F8}' },
  { name: 'Royaume-Uni', code: 'GB', dial: '+44', flag: '\u{1F1EC}\u{1F1E7}' },
]

type Profile = {
  email: string
  full_name: string
  phone: string
  country: string
  avatar_url: string | null
  org_name: string
}

export default function SettingsPage() {
  const { theme, setTheme, locale, setLocale, dict } = usePreferences()
  const t = dict.settings
  const [profile, setProfile] = useState<Profile | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [fbCategory, setFbCategory] = useState('support')
  const [fbSubject, setFbSubject] = useState('')
  const [fbMessage, setFbMessage] = useState('')
  const [fbBusy, setFbBusy] = useState(false)
  const [fbMsg, setFbMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/settings/profile')
        const j = await r.json().catch(() => ({}))
        if (r.ok && j.profile) setProfile(j.profile)
      } catch { /* ignore */ }
    })()
  }, [])

  async function saveProfile() {
    if (!profile) return
    setBusy(true)
    setMsg('')
    setError('')
    try {
      const r = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || 'Enregistrement impossible')
      setMsg(t.saved || 'Enregistr\u00e9')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    }
    setBusy(false)
  }

  async function sendFeedback() {
    setFbBusy(true)
    setFbMsg('')
    const r = await fetch('/api/support/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: fbSubject, message: fbMessage, category: fbCategory }),
    })
    const j = await r.json().catch(() => ({}))
    setFbMsg(r.ok ? (t.feedbackSent || 'Message envoy\u00e9') : (j.error || 'Erreur'))
    if (r.ok) {
      setFbSubject('')
      setFbMessage('')
    }
    setFbBusy(false)
  }

  return (
    <AppShell active="Settings">
      <div className="notice" style={{ marginBottom: 12 }}>
        Conik MCP se configure dans{' '}
        <a href="/integrations?tab=mcp">
          <b>Int\u00e9grations \u2192 MCP</b>
        </a>
        .
      </div>
      <header>
        <div>
          <h1>{t.title || 'Param\u00e8tres'}</h1>
          <p className="muted">{t.subtitle || 'Profil, espace et pr\u00e9f\u00e9rences'}</p>
        </div>
      </header>

      {msg && <div className="notice">{msg}</div>}
      {error && <div className="error">{error}</div>}

      <section className="panel" style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={18} /> {t.profile || 'Profil'}
        </h3>
        {profile ? (
          <>
            <label className="form-label">
              {t.fullName || 'Nom'}
              <input
                className="form-input"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </label>
            <label className="form-label">
              Email
              <input className="form-input" value={profile.email} disabled />
            </label>
            <label className="form-label">
              {t.phone || 'T\u00e9l\u00e9phone'}
              <input
                className="form-input"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </label>
            <label className="form-label">
              {t.country || 'Pays'}
              <select
                className="form-input"
                value={profile.country}
                onChange={(e) => setProfile({ ...profile, country: e.target.value })}
              >
                <option value="">—</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="primary" disabled={busy} onClick={() => void saveProfile()}>
              {busy ? '…' : t.save || 'Enregistrer'}
            </button>
          </>
        ) : (
          <p className="muted">Chargement…</p>
        )}
      </section>

      <section className="panel" style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>{t.preferences || 'Pr\u00e9f\u00e9rences'}</h3>
        <label className="form-label">
          {t.theme || 'Th\u00e8me'}
          <select className="form-input" value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="form-label">
          {t.language || 'Langue'}
          <select className="form-input" value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
            {locales.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </section>

      <SettingsCollaboration />
      <SettingsTutorial />

      <section className="panel" style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquarePlus size={18} /> {t.support || 'Support'}
        </h3>
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="form-label">
            {t.category || 'Cat\u00e9gorie'}
            <select className="form-input" value={fbCategory} onChange={(e) => setFbCategory(e.target.value)}>
              <option value="support">Support</option>
              <option value="bug">Bug</option>
              <option value="idea">Id\u00e9e</option>
            </select>
          </label>
          <label className="form-label">
            {t.subject || 'Sujet'}
            <input className="form-input" value={fbSubject} onChange={(e) => setFbSubject(e.target.value)} />
          </label>
          <label className="form-label" style={{ gridColumn: '1 / -1' }}>
            {t.message || 'Message'}
            <textarea
              className="form-input"
              rows={4}
              value={fbMessage}
              onChange={(e) => setFbMessage(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </label>
        </div>
        <div className="button-row" style={{ marginTop: 12 }}>
          <button
            className="primary"
            type="button"
            disabled={fbBusy || fbSubject.trim().length < 3 || fbMessage.trim().length < 10}
            onClick={() => void sendFeedback()}
          >
            {fbBusy ? t.sending || 'Envoi…' : t.sendSupport || 'Envoyer'}
          </button>
        </div>
        {fbMsg && <div className="notice" style={{ marginTop: 10 }}>{fbMsg}</div>}
      </section>
    </AppShell>
  )
}
