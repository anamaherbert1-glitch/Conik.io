'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  Copy,
  Radio,
  Trash2,
  Send,
  Smartphone,
  Link2,
  MessageSquare,
  MessageSquareOff,
  UserPlus,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { ConikDialog } from '@/components/conik-dialog'
import MultiLiveRoom from '@/components/live/multi-live-room'
import LiveStudioLayout from '@/components/live/live-studio-layout'
import LiveChat from '@/components/live/live-chat'

type Participant = { id: string; contact_id: string; email: string; status: string; invited_at: string }
type Attendee = {
  participant_id: string
  contact_id: string
  display_name: string
  email: string
  status: string
  joined_at: string | null
  last_seen_at: string | null
  connected: boolean
}
type Live = {
  id: string
  title: string
  description: string | null
  slug: string
  scheduled_at: string
  timezone: string
  status: string
  stream_provider: string | null
  stream_id: string | null
  chat_enabled: boolean
}
const EMPTY_LIVE: Live = {
  id: '',
  title: '',
  description: null,
  slug: '',
  scheduled_at: '',
  timezone: '',
  status: 'loading',
  stream_provider: null,
  stream_id: null,
  chat_enabled: true,
}

export default function LiveDetail({ params }: { params: Promise<{ id: string }> }) {
  const [live, setLive] = useState<Live>(EMPTY_LIVE)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [selected, setSelected] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [studio, setStudio] = useState(false)
  const [ending, setEnding] = useState(false)
  const [endConfirmOpen, setEndConfirmOpen] = useState(false)
  const [waMessage, setWaMessage] = useState('')
  const [waEligible, setWaEligible] = useState(0)
  const [waInvited, setWaInvited] = useState(0)
  const [waSaving, setWaSaving] = useState(false)
  const [chatSaving, setChatSaving] = useState(false)
  const [cohostLink, setCohostLink] = useState('')
  const [cohostLoading, setCohostLoading] = useState(false)

  async function load(id: string) {
    const [l, p, c, a, w] = await Promise.all([
      fetch('/api/lives').then((r) => r.json()),
      fetch(`/api/lives/${id}/participants`).then((r) => r.json()),
      fetch('/api/contacts').then((r) => r.json()),
      fetch(`/api/lives/presence?live_id=${id}`, { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => ({})),
      fetch(`/api/lives/${id}/whatsapp`, { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => ({})),
    ])
    setLive((l.lives || []).find((x: Live) => x.id === id) || EMPTY_LIVE)
    setParticipants(p.participants || [])
    setContacts(c.contacts || [])
    setAttendees(a.attendees || [])
    setWaMessage(w.draft || '')
    setWaEligible(w.whatsapp_eligible || 0)
    setWaInvited(w.total_invited || 0)
  }

  useEffect(() => {
    let timer: number | undefined
    params.then(({ id }) => {
      load(id).catch(() => setError('Impossible de charger cet événement'))
      timer = window.setInterval(() => {
        void fetch(`/api/lives/presence?live_id=${id}`, { cache: 'no-store' })
          .then((r) => r.json())
          .then((j) => setAttendees(j.attendees || []))
          .catch(() => {})
      }, 5000)
    })
    return () => {
      if (timer) window.clearInterval(timer)
    }
  }, [params])

  async function add() {
    if (!live.id || !selected) return
    setError('')
    const r = await fetch(`/api/lives/${live.id}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_ids: [selected] }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Impossible d’ajouter le contact')
    else {
      setSelected('')
      setNotice('Contact autorisé.')
      await load(live.id)
    }
  }

  async function remove(contactId: string) {
    if (!live.id) return
    const r = await fetch(`/api/lives/${live.id}/participants`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contactId }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Impossible de retirer le contact')
    else {
      setNotice('Contact retiré.')
      await load(live.id)
    }
  }

  function copy() {
    if (!live.id) return
    navigator.clipboard?.writeText(`${window.location.origin}/live/${live.slug}`)
    setNotice('Lien copié.')
  }

  async function startStudio() {
    if (!live.id) return
    setError('')
    const r = await fetch(`/api/lives/${live.id}/token`, { method: 'POST' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setError(j.error || 'Impossible de démarrer le studio')
      return
    }
    setLive((v) => ({ ...v, stream_provider: 'livekit', stream_id: j.room, status: 'live' }))
    setStudio(true)
    setNotice('Studio prêt.')
  }

  async function createCohostInvite() {
    if (!live.id || cohostLoading) return
    setCohostLoading(true)
    setError('')
    const r = await fetch(`/api/lives/${live.id}/cohost-invite`, { method: 'POST' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Impossible de créer le lien organisateur.')
    else {
      setCohostLink(j.link || '')
      setNotice('Lien organisateur créé. Il est valable 24 heures et à usage unique.')
    }
    setCohostLoading(false)
  }

  async function endLive() {
    if (!live.id || ending) return
    setEnding(true)
    setError('')
    const r = await fetch(`/api/lives/${live.id}/end`, { method: 'POST' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setError(j.error || 'Impossible de terminer le Live.')
      setEnding(false)
      return
    }
    setLive((v) => ({ ...v, status: 'ended' }))
    setStudio(false)
    setEndConfirmOpen(false)
    setNotice('Live terminé.')
    setEnding(false)
  }

  async function toggleChat() {
    if (!live.id || chatSaving) return
    setChatSaving(true)
    setError('')
    const enabled = !live.chat_enabled
    const r = await fetch(`/api/lives/${live.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_enabled: enabled }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Impossible de modifier le chat.')
    else {
      setLive((v) => ({ ...v, chat_enabled: j.chat_enabled }))
      setNotice(enabled ? 'Chat des followers activé.' : 'Chat des followers désactivé.')
    }
    setChatSaving(false)
  }

  async function saveWhatsApp() {
    if (!live.id || !waMessage.trim()) return
    setWaSaving(true)
    setError('')
    const r = await fetch(`/api/lives/${live.id}/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: waMessage }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Impossible d’enregistrer le message WhatsApp.')
    else setNotice('Message WhatsApp enregistré.')
    setWaSaving(false)
  }

  const allowed = new Set(participants.map((p) => p.contact_id))
  const contactName = (contactId: string, email: string) => {
    const c = contacts.find((x) => x.id === contactId)
    return c ? [c.first_name, c.last_name].filter(Boolean).join(' ') || email : email
  }

  /** Panneau compact : pas de stats invités/connectés */
  const inviteSidebar = (
    <div style={{ display: 'grid', gap: 6 }}>
      {/* Organisateurs : icône invite + copier lien sur la même ligne */}
      <div>
        <div className="muted" style={{ fontSize: 9, fontWeight: 800, marginBottom: 4, letterSpacing: '.04em' }}>
          ORGANISATEURS
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => void createCohostInvite()}
            disabled={cohostLoading || live.status === 'ended' || !live.id}
            className="primary"
            title={cohostLoading ? 'Création…' : 'Inviter un organisateur'}
            aria-label="Inviter un organisateur"
            style={{
              width: 36,
              minWidth: 36,
              height: 36,
              minHeight: 36,
              padding: 0,
              display: 'grid',
              placeItems: 'center',
              flex: '0 0 auto',
            }}
          >
            <UserPlus size={16} />
          </button>
          <button
            type="button"
            className="outline"
            disabled={!cohostLink}
            onClick={() => {
              if (!cohostLink) return
              navigator.clipboard?.writeText(cohostLink)
              setNotice('Lien organisateur copié.')
            }}
            title={cohostLink ? 'Copier le lien organisateur' : 'Créez d’abord un lien'}
            style={{
              flex: 1,
              minHeight: 36,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              opacity: cohostLink ? 1 : 0.55,
            }}
          >
            <Copy size={13} />
            Copier le lien
          </button>
        </div>
        {cohostLink && (
          <div
            className="choice"
            style={{
              marginTop: 5,
              fontSize: 9,
              wordBreak: 'break-all',
              padding: '6px 8px',
              lineHeight: 1.35,
              maxHeight: 48,
              overflow: 'hidden',
            }}
            title={cohostLink}
          >
            {cohostLink}
          </div>
        )}
      </div>

      {/* Chat on/off */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 6 }}>
        <div className="muted" style={{ fontSize: 9, fontWeight: 800, marginBottom: 4, letterSpacing: '.04em' }}>
          CHAT
        </div>
        <button
          type="button"
          onClick={() => void toggleChat()}
          disabled={chatSaving || live.status === 'ended' || !live.id}
          className={live.chat_enabled ? 'outline' : 'primary'}
          style={{
            width: '100%',
            minHeight: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {live.chat_enabled ? (
            <>
              <MessageSquareOff size={13} />
              {chatSaving ? '…' : 'Couper le chat'}
            </>
          ) : (
            <>
              <MessageSquare size={13} />
              {chatSaving ? '…' : 'Réactiver le chat'}
            </>
          )}
        </button>
      </div>

      {/* Ajouter contact — remonté */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 6 }}>
        <div className="muted" style={{ fontSize: 9, fontWeight: 800, marginBottom: 4, letterSpacing: '.04em' }}>
          AJOUTER UN CONTACT
        </div>
        <select
          className="form-input"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          style={{ width: '100%', fontSize: 11, minHeight: 32, padding: '4px 8px' }}
        >
          <option value="">Choisir…</option>
          {contacts
            .filter((c) => c.email && !allowed.has(c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
              </option>
            ))}
        </select>
        <button
          className="primary"
          onClick={add}
          disabled={!selected || !live.id}
          style={{ width: '100%', minHeight: 32, marginTop: 5, fontSize: 11 }}
        >
          Autoriser
        </button>
      </div>

      {participants.length > 0 && (
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 6, display: 'grid', gap: 4 }}>
          {participants.slice(0, 8).map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                fontSize: 10,
              }}
            >
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {contactName(p.contact_id, p.email)}
              </span>
              <button
                className="outline"
                onClick={() => remove(p.contact_id)}
                aria-label="Retirer"
                style={{ width: 26, height: 26, padding: 0, display: 'grid', placeItems: 'center', flex: '0 0 auto' }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const inStudio = studio && live.status !== 'ended'

  return (
    <AppShell active="Live Events" compact={inStudio}>
      <div
        className="page"
        style={{
          maxWidth: inStudio ? 'none' : 1180,
          width: '100%',
          margin: inStudio ? 0 : undefined,
          padding: inStudio ? 0 : undefined,
        }}
      >
        {!inStudio && (
          <Link href="/lives" className="back">
            <ArrowLeft size={16} />
            Live Events
          </Link>
        )}
        {error && (
          <div className="error" style={{ marginBottom: 12 }}>
            {error}
          </div>
        )}
        {notice && (
          <div className="notice" style={{ marginBottom: 12 }}>
            {notice}
          </div>
        )}

        {live.status === 'loading' ? (
          <div className="emptybox big">Chargement…</div>
        ) : (
          <>
            {!inStudio && (
              <header className="head" style={{ marginBottom: 22, alignItems: 'flex-start' }}>
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '.08em',
                      opacity: 0.65,
                      marginBottom: 7,
                    }}
                  >
                    <Radio size={14} />
                    LIVE PRIVÉ
                  </div>
                  <h1 style={{ marginBottom: 6 }}>{live.title}</h1>
                  {live.description && (
                    <p className="muted" style={{ margin: 0, maxWidth: 650 }}>
                      {live.description}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {live.status !== 'ended' && (
                    <button className="primary" onClick={startStudio} disabled={studio}>
                      <Radio size={15} />
                      {studio ? 'Studio ouvert' : 'Démarrer le studio'}
                    </button>
                  )}
                  <button className="outline" onClick={copy}>
                    <Copy size={15} />
                    Copier le lien
                  </button>
                </div>
              </header>
            )}

            {inStudio && (
              <div className="live-studio-workspace">
                <div className="live-studio-main">
                  <section className="panel" style={{ marginBottom: 0, padding: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 8,
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Radio size={16} />
                        <h3 style={{ margin: 0, fontSize: 15 }}>{live.title}</h3>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="outline" onClick={copy} style={{ minHeight: 32, fontSize: 11 }}>
                          <Copy size={13} />
                          Lien
                        </button>
                        <Link
                          href="/lives"
                          className="outline"
                          style={{
                            minHeight: 32,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '0 10px',
                            fontSize: 11,
                          }}
                        >
                          <ArrowLeft size={13} />
                          Quitter
                        </Link>
                      </div>
                    </div>
                    <LiveStudioLayout host sidebarContent={inviteSidebar}>
                      <MultiLiveRoom
                        tokenUrl={`/api/lives/${live.id}/token`}
                        tokenBody={{}}
                        host
                        onEndLive={() => setEndConfirmOpen(true)}
                        endingLive={ending}
                      />
                    </LiveStudioLayout>
                  </section>
                </div>

                <aside className="live-studio-chat">
                  <LiveChat liveId={live.id} host chatEnabled={live.chat_enabled} />
                </aside>
              </div>
            )}

            {!inStudio && live.status !== 'ended' && (
              <section style={{ marginBottom: 18 }}>
                <LiveChat liveId={live.id} host chatEnabled={live.chat_enabled} />
              </section>
            )}

            {!inStudio && (
              <>
                <section className="panel" style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
                    <Smartphone size={18} />
                    <h3 style={{ margin: 0 }}>WhatsApp</h3>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
                      {waEligible}/{waInvited} éligibles
                    </span>
                  </div>
                  <p className="muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
                    Préparez le message d’invitation. Le lien de ce Live sera utilisé automatiquement.
                  </p>
                  <textarea
                    className="form-input"
                    rows={4}
                    value={waMessage}
                    onChange={(e) => setWaMessage(e.target.value)}
                    placeholder="Message d’invitation…"
                  />
                  <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                    <button className="primary" onClick={saveWhatsApp} disabled={waSaving || !waMessage.trim()}>
                      <Send size={15} />
                      {waSaving ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                  </div>
                </section>

                <section className="panel" style={{ marginTop: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                    <Link2 size={18} />
                    <h3 style={{ margin: 0 }}>Lien du Live</h3>
                  </div>
                  <div className="choice" style={{ fontSize: 13, wordBreak: 'break-all' }}>
                    {typeof window !== 'undefined' ? window.location.origin : ''}/live/{live.slug}
                  </div>
                </section>
              </>
            )}
          </>
        )}

        <ConikDialog
          open={endConfirmOpen}
          title="Terminer ce Live ?"
          message="Le Live sera marqué comme terminé. Les participants ne pourront plus rejoindre la session en direct."
          tone="warning"
          confirmLabel="Terminer le Live"
          busy={ending}
          onConfirm={() => void endLive()}
          onCancel={() => !ending && setEndConfirmOpen(false)}
        />
      </div>
    </AppShell>
  )
}
