'use client'

import { useEffect, useState } from 'react'
import { Users, UserMinus, Mail, Shield, ChevronDown } from 'lucide-react'

type Role = 'admin' | 'editor' | 'viewer'
type Invite = { id: string; email: string; role: string; status: string; created_at?: string }
type Member = { id: string; user_id: string; role: string; created_at?: string; email?: string }

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  editor: 'Éditeur',
  viewer: 'Lecteur',
}

const ROLE_HINTS: Record<Role, string> = {
  admin: 'Gère l’équipe, les intégrations et la facturation.',
  editor: 'Crée et modifie les tunnels, campagnes et contenus.',
  viewer: 'Consulte les données sans pouvoir modifier.',
}

export function SettingsCollaboration() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('editor')
  const [roleOpen, setRoleOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)
  const [invites, setInvites] = useState<Invite[]>([])
  const [members, setMembers] = useState<Member[]>([])

  async function load() {
    const r = await fetch('/api/team/invite')
    if (!r.ok) return
    const j = await r.json()
    setInvites(j.invites || [])
    setMembers(j.members || [])
  }

  useEffect(() => {
    void load()
  }, [])

  async function invite() {
    setBusy(true)
    setMsg('')
    setIsError(false)
    const r = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setMsg(j.error || 'Invitation impossible')
      setIsError(true)
    } else {
      setMsg(j.message || `Invitation envoyée à ${email}`)
      setEmail('')
      void load()
    }
    setBusy(false)
  }

  async function revokeInvite(id: string) {
    if (!confirm('Retirer cette invitation ?')) return
    const r = await fetch('/api/team/invite', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId: id }),
    })
    if (r.ok) void load()
    else {
      const j = await r.json().catch(() => ({}))
      alert(j.error || 'Impossible de retirer')
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Retirer l’accès de ce collaborateur ?')) return
    const r = await fetch('/api/team/invite', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    if (r.ok) void load()
    else {
      const j = await r.json().catch(() => ({}))
      alert(j.error || 'Impossible de retirer')
    }
  }

  return (
    <section className="panel settings-section" id="collaboration">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Users size={18} />
        <h3 style={{ margin: 0 }}>Collaboration</h3>
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Invitez des collaborateurs sur votre espace. L’organisateur principal garde le contrôle et peut
        retirer un accès à tout moment.
      </p>

      <div className="collab-invite-box">
        <label className="form-label" style={{ margin: 0, flex: 1, minWidth: 180 }}>
          E-mail du collaborateur
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="collegue@email.com"
          />
        </label>

        <div className="form-label" style={{ margin: 0, minWidth: 160 }}>
          Rôle
          <button type="button" className="role-trigger" onClick={() => setRoleOpen(true)}>
            <Shield size={14} />
            <span>{ROLE_LABELS[role]}</span>
            <ChevronDown size={14} />
          </button>
        </div>

        <button
          type="button"
          className="primary"
          disabled={busy || !email.trim()}
          onClick={() => void invite()}
          style={{ alignSelf: 'flex-end' }}
        >
          {busy ? 'Envoi…' : 'Inviter'}
        </button>
      </div>

      {msg && (
        <div className={isError ? 'error' : 'notice'} style={{ marginTop: 10 }}>
          {msg}
        </div>
      )}

      <div className="collab-lists">
        <div>
          <b style={{ fontSize: 13 }}>Équipe active</b>
          {members.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Aucun membre listé.</p>}
          <ul className="collab-list">
            {members.map((m, i) => (
              <li key={m.id}>
                <div>
                  <strong>{m.email || m.user_id.slice(0, 8) + '…'}</strong>
                  <span className="admin-badge" style={{ marginLeft: 8 }}>
                    {i === 0 && m.role === 'owner' ? 'Organisateur' : ROLE_LABELS[m.role as Role] || m.role}
                  </span>
                </div>
                {m.role !== 'owner' && (
                  <button type="button" className="outline" onClick={() => void removeMember(m.id)}>
                    <UserMinus size={14} /> Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <b style={{ fontSize: 13 }}>Invitations en attente</b>
          {invites.filter((i) => i.status === 'pending').length === 0 && (
            <p className="muted" style={{ fontSize: 13 }}>Aucune invitation en attente.</p>
          )}
          <ul className="collab-list">
            {invites
              .filter((i) => i.status === 'pending')
              .map((i) => (
                <li key={i.id}>
                  <div>
                    <Mail size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    <strong>{i.email}</strong>
                    <span className="admin-badge" style={{ marginLeft: 8 }}>
                      {ROLE_LABELS[i.role as Role] || i.role}
                    </span>
                  </div>
                  <button type="button" className="outline" onClick={() => void revokeInvite(i.id)}>
                    Annuler
                  </button>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {roleOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRoleOpen(false)
          }}
        >
          <div className="country-modal role-modal" role="dialog" aria-modal="true">
            <div className="country-modal-head">
              <div>
                <b>Choisir un rôle</b>
                <span className="muted">Définit les permissions du collaborateur.</span>
              </div>
              <button type="button" className="icon-button" onClick={() => setRoleOpen(false)}>
                ×
              </button>
            </div>
            <div className="role-options">
              {(['admin', 'editor', 'viewer'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`role-option ${role === r ? 'active' : ''}`}
                  onClick={() => {
                    setRole(r)
                    setRoleOpen(false)
                  }}
                >
                  <strong>{ROLE_LABELS[r]}</strong>
                  <span className="muted">{ROLE_HINTS[r]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
