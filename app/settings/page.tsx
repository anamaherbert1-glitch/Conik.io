'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { usePreferences } from '@/components/preferences-provider'
import { locales, type Locale, type Theme } from '@/lib/i18n/dictionaries'
import { Moon, Sun, Monitor, MessageSquarePlus, UserPlus, User, Building2 } from 'lucide-react'

type Profile = {
  email: string
  fullName: string
  phone: string
  country: string
  city: string
  company: string
  avatarUrl: string
  orgName: string
}

export default function SettingsPage() {
  const { dict, locale, theme, setLocale, setTheme } = usePreferences()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)
  const [busy, setBusy] = useState(false)

  const [fbSubject, setFbSubject] = useState('')
  const [fbMessage, setFbMessage] = useState('')
  const [fbCategory, setFbCategory] = useState<'bug' | 'idea' | 'question' | 'other'>('bug')
  const [fbBusy, setFbBusy] = useState(false)
  const [fbMsg, setFbMsg] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [invites, setInvites] = useState<Array<{ id: string; email: string; role: string; status: string }>>([])

  useEffect(() => {
    void loadProfile()
    void loadInvites()
  }, [])

  async function loadProfile() {
    const r = await fetch('/api/profile')
    if (!r.ok) return
    const j = await r.json()
    setProfile({
      email: j.email || '',
      fullName: j.fullName || '',
      phone: j.phone || '',
      country: j.country || '',
      city: j.city || '',
      company: j.company || '',
      avatarUrl: j.avatarUrl || '',
      orgName: j.orgName || '',
    })
  }

  async function loadInvites() {
    const r = await fetch('/api/team/invite')
    if (!r.ok) return
    const j = await r.json()
    setInvites(j.invites || [])
  }

  async function saveProfile() {
    if (!profile) return
    setBusy(true)
    setMsg('')
    setIsError(false)
    const r = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setMsg(j.error || 'Erreur enregistrement')
      setIsError(true)
    } else {
      setMsg('Profil enregistré')
      setIsError(false)
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
    if (!r.ok) {
      setFbMsg(j.error || 'Envoi impossible')
    } else {
      setFbMsg(j.message || 'Message envoyé')
      setFbSubject('')
      setFbMessage('')
    }
    setFbBusy(false)
  }

  async function sendInvite() {
    setInviteBusy(true)
    setInviteMsg('')
    const r = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setInviteMsg(j.error || 'Invitation impossible')
    } else {
      setInviteMsg(j.message || 'Invitation envoyée')
      setInviteEmail('')
      void loadInvites()
    }
    setInviteBusy(false)
  }

  return (
    <AppShell active="Settings">
      <header>
        <div>
          <small>SETTINGS</small>
          <h1>{dict.settings.title}</h1>
          <p className="muted">Profil, équipe, apparence et support.</p>
        </div>
      </header>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Apparence</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {([
            ['system', Monitor, 'Système'],
            ['light', Sun, 'Clair'],
            ['dark', Moon, 'Sombre'],
          ] as const).map(([t, Icon, label]) => (
            <button key={t} type="button" className={theme === t ? 'primary' : 'outline'} onClick={() => setTheme(t as Theme)}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {locales.map((l) => (
            <button key={l.code} type="button" className={locale === l.code ? 'primary' : 'outline'} onClick={() => setLocale(l.code as Locale)}>
              {l.native}
            </button>
          ))}
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <User size={18} />
          <h3 style={{ margin: 0 }}>Profil</h3>
        </div>
        {profile && (
          <div className="form-grid">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', gridColumn: '1 / -1' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  background: 'var(--panel-2, #f1f5f9)',
                  overflow: 'hidden',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid var(--border, #e5e7eb)',
                  flexShrink: 0,
                }}
              >
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={28} opacity={0.45} />
                )}
              </div>
              <label className="form-label" style={{ flex: 1, margin: 0 }}>
                Photo de profil (URL)
                <input
                  className="form-input"
                  placeholder="https://…"
                  value={profile.avatarUrl}
                  onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                />
              </label>
            </div>
            <label className="form-label">
              Nom complet
              <input className="form-input" value={profile.fullName} onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
            </label>
            <label className="form-label">
              E-mail
              <input className="form-input" value={profile.email} disabled />
            </label>
            <label className="form-label">
              Téléphone
              <input className="form-input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+228…" />
            </label>
            <label className="form-label">
              Pays
              <input className="form-input" value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} placeholder="Togo, Sénégal…" />
            </label>
            <label className="form-label">
              Ville
              <input className="form-input" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
            </label>
            <label className="form-label">
              Entreprise
              <input className="form-input" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} />
            </label>
            <label className="form-label">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Building2 size={14} /> Nom de l’espace de travail</span>
              <input className="form-input" value={profile.orgName} onChange={(e) => setProfile({ ...profile, orgName: e.target.value })} />
            </label>
          </div>
        )}
        <div className="button-row" style={{ marginTop: 12 }}>
          <button className="primary" onClick={() => void saveProfile()} disabled={busy || !profile}>
            {busy ? 'Enregistrement…' : 'Enregistrer le profil'}
          </button>
        </div>
        {msg && <div className={isError ? 'error' : 'notice'} style={{ marginTop: 10 }}>{msg}</div>}
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <UserPlus size={18} />
          <h3 style={{ margin: 0 }}>Équipe — inviter un collaborateur</h3>
        </div>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Invitez quelqu’un à travailler avec vous sur vos tunnels et projets (admin, éditeur ou lecteur).
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="form-label" style={{ flex: 1, minWidth: 180, margin: 0 }}>
            E-mail
            <input className="form-input" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="collegue@email.com" />
          </label>
          <label className="form-label" style={{ margin: 0 }}>
            Rôle
            <select className="form-input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}>
              <option value="editor">Éditeur</option>
              <option value="admin">Admin</option>
              <option value="viewer">Lecteur</option>
            </select>
          </label>
          <button className="primary" type="button" disabled={inviteBusy || !inviteEmail.trim()} onClick={() => void sendInvite()}>
            {inviteBusy ? 'Envoi…' : 'Inviter'}
          </button>
        </div>
        {inviteMsg && <div className="notice" style={{ marginTop: 10 }}>{inviteMsg}</div>}
        {invites.length > 0 && (
          <div style={{ marginTop: 14, display: 'grid', gap: 6 }}>
            <b style={{ fontSize: 13 }}>Invitations</b>
            {invites.map((i) => (
              <div key={i.id} style={{ fontSize: 13, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span>{i.email}</span>
                <span className="muted">· {i.role} · {i.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <MessageSquarePlus size={18} />
          <h3 style={{ margin: 0 }}>Support & feedback</h3>
        </div>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Un bug, une remarque ou une idée ? Envoyez un message à l’équipe Conik.
        </p>
        <div className="form-grid">
          <label className="form-label">
            Type
            <select className="form-input" value={fbCategory} onChange={(e) => setFbCategory(e.target.value as typeof fbCategory)}>
              <option value="bug">Bug / mauvais fonctionnement</option>
              <option value="idea">Idée d’amélioration</option>
              <option value="question">Question</option>
              <option value="other">Autre</option>
            </select>
          </label>
          <label className="form-label">
            Sujet
            <input className="form-input" value={fbSubject} onChange={(e) => setFbSubject(e.target.value)} placeholder="Ex. Erreur à la publication" />
          </label>
          <label className="form-label" style={{ gridColumn: '1 / -1' }}>
            Message
            <textarea
              className="form-input"
              rows={4}
              value={fbMessage}
              onChange={(e) => setFbMessage(e.target.value)}
              placeholder="Décrivez le problème ou votre remarque…"
              style={{ resize: 'vertical' }}
            />
          </label>
        </div>
        <div className="button-row" style={{ marginTop: 12 }}>
          <button className="primary" type="button" disabled={fbBusy || fbSubject.trim().length < 3 || fbMessage.trim().length < 10} onClick={() => void sendFeedback()}>
            {fbBusy ? 'Envoi…' : 'Envoyer au support'}
          </button>
        </div>
        {fbMsg && <div className="notice" style={{ marginTop: 10 }}>{fbMsg}</div>}
      </section>
    </AppShell>
  )
}
