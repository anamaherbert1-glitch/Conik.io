'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { usePreferences } from '@/components/preferences-provider'
import { createClient } from '@/lib/supabase/client'
import { locales, type Locale, type Theme } from '@/lib/i18n/dictionaries'
import { Moon, Sun, Monitor } from 'lucide-react'

export default function SettingsPage() {
  const { dict, locale, theme, setLocale, setTheme } = usePreferences()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      const s = createClient()
      const { data: { user } } = await s.auth.getUser()
      setEmail(user?.email || '')
      if (!user) return
      const { data: m } = await s.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).maybeSingle()
      if (m) {
        const { data: o } = await s.from('organizations').select('name').eq('id', m.organization_id).single()
        setName(o?.name || '')
      }
    })()
  }, [])

  async function save() {
    setBusy(true)
    setMsg('')
    setIsError(false)
    const s = createClient()
    const { data: { user } } = await s.auth.getUser()
    if (!user) {
      setMsg(dict.settings.sessionExpired)
      setIsError(true)
      setBusy(false)
      return
    }
    const { data: m } = await s.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).maybeSingle()
    if (!m) {
      setMsg(dict.settings.workspaceMissing)
      setIsError(true)
      setBusy(false)
      return
    }
    const { error } = await s.from('organizations').update({ name: name.trim() }).eq('id', m.organization_id)
    if (error) {
      setMsg(error.message)
      setIsError(true)
    } else {
      setMsg(dict.settings.saved)
      setIsError(false)
    }
    setBusy(false)
  }

  return (
    <AppShell active="Settings">
      <header>
        <div>
          <small>SETTINGS</small>
          <h1>{dict.settings.title}</h1>
          <p className="muted">{dict.settings.subtitle}</p>
        </div>
      </header>
      <section className="panel" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>{dict.settings.theme}</h3>
        <div className="button-row" style={{ marginBottom: 0 }}>
          {([['light', dict.settings.themeLight, Sun], ['dark', dict.settings.themeDark, Moon], ['system', dict.settings.themeSystem, Monitor]] as const).map(([value, label, Icon]) => (
            <button key={value} type="button" className={theme === value ? 'primary' : 'outline'} onClick={() => setTheme(value as Theme)}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>
      </section>
      <section className="panel" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>{dict.settings.language}</h3>
        <div className="button-row" style={{ marginBottom: 0, flexWrap: 'wrap' }}>
          {locales.map((l) => (
            <button key={l.code} type="button" className={locale === l.code ? 'primary' : 'outline'} onClick={() => setLocale(l.code as Locale)}>
              {l.native}
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="form-grid">
          <label className="form-label">{dict.settings.orgName}<input className="form-input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="form-label">{dict.settings.email}<input className="form-input" value={email} disabled /></label>
        </div>
        <div className="button-row">
          <button className="primary" onClick={save} disabled={busy || !name.trim()}>{busy ? dict.settings.saving : dict.settings.save}</button>
        </div>
        {msg && <div className={isError ? 'error' : 'notice'}>{msg}</div>}
      </section>
    </AppShell>
  )
}
