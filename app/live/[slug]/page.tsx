'use client'

import { LockKeyhole, Radio, ShieldCheck, Maximize2, Minimize2, MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import MultiLiveRoom from '@/components/live/multi-live-room'
import LiveChat from '@/components/live/live-chat'

type Live = {
  id: string
  title: string
  description: string | null
  scheduled_at: string
  timezone: string
  status: string
  stream_provider: string | null
  stream_id: string | null
  chat_enabled: boolean
}

export default function PublicLive({ params }: { params: Promise<{ slug: string }> }) {
  const [live, setLive] = useState<Live | null>(null)
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [attendeeName, setAttendeeName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [chatOpen, setChatOpen] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const followerShellRef = useRef<HTMLDivElement>(null)

  async function markPresence(s: string) {
    const r = await fetch('/api/lives/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: s }),
      cache: 'no-store',
    })
    const j = await r.json().catch(() => ({}))
    if (r.ok && j.attendee?.display_name) setAttendeeName(j.attendee.display_name)
  }

  useEffect(() => {
    let timer: number | undefined
    let active = true
    ;(async () => {
      try {
        const { slug: s } = await params
        if (!active) return
        setSlug(s)
        const r = await fetch(`/api/lives/access?slug=${encodeURIComponent(s)}`, { cache: 'no-store' })
        const j = await r.json().catch(() => ({}))
        if (!active) return
        if (r.ok && j.authorized) {
          setLive(j.live)
          await markPresence(s)
          if (active) timer = window.setInterval(() => void markPresence(s), 10000)
        }
        setLoading(false)
      } catch {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
      if (timer) window.clearInterval(timer)
    }
  }, [params])

  async function requestAccess(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const r = await fetch('/api/lives/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, email }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) {
      setError(j.error || 'Accès refusé.')
      setSubmitting(false)
      return
    }
    setLive(j.live)
    const p = await fetch('/api/lives/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
      cache: 'no-store',
    })
    const pj = await p.json().catch(() => ({}))
    if (p.ok && pj.attendee?.display_name) setAttendeeName(pj.attendee.display_name)
    setSubmitting(false)
  }

  async function toggleFullscreen() {
    const el = followerShellRef.current
    if (!el) return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
        try {
          await (screen.orientation as any)?.unlock?.()
        } catch {}
      } else {
        await el.requestFullscreen()
        try {
          await (screen.orientation as any)?.lock?.('landscape')
        } catch {}
      }
    } catch {
      setError('Le plein écran n’est pas disponible dans ce navigateur.')
    }
  }

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  if (loading)
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <p>Vérification de votre accès…</p>
      </main>
    )

  if (!live)
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="choice" style={{ maxWidth: 520, width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <LockKeyhole size={34} />
            <h1>Live privé</h1>
            <p>Entrez l’adresse e-mail qui a été autorisée par l’organisateur.</p>
          </div>
          {error && (
            <div className="error" style={{ marginTop: 16 }}>
              {error}
            </div>
          )}
          <form onSubmit={requestAccess} style={{ marginTop: 18 }}>
            <input
              className="form-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Votre adresse e-mail"
            />
            <button className="primary" style={{ width: '100%', marginTop: 10 }} disabled={submitting}>
              {submitting ? 'Vérification…' : 'Accéder au Live'}
            </button>
          </form>
        </div>
      </main>
    )

  const ended = live.status === 'ended'

  return (
    <main
      className="conik-public-live-page"
      style={{ minHeight: '100vh', padding: '24px clamp(14px,3vw,38px)', width: '100%', maxWidth: 1500, margin: '0 auto' }}
    >
      <header
        className="conik-public-live-header"
        style={{ padding: '18px 0 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}
      >
        <div style={{ minWidth: 0 }}>
          <span className="live">
            <Radio size={14} /> {ended ? 'LIVE TERMINÉ' : live.status === 'live' ? 'EN DIRECT' : 'ÉVÉNEMENT PRIVÉ'}
          </span>
          <h1 style={{ marginTop: 10 }}>{live.title}</h1>
          {attendeeName && <p style={{ fontWeight: 700 }}>Connecté en tant que {attendeeName}</p>}
          {live.description && <p className="muted">{live.description}</p>}
          <p className="muted">
            {new Date(live.scheduled_at).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })} · {live.timezone}
          </p>
        </div>
      </header>

      {ended ? (
        <section className="panel" style={{ minHeight: 300, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <ShieldCheck size={42} />
            <h2>Ce Live est terminé</h2>
            <p className="muted">Merci d’avoir participé.</p>
          </div>
        </section>
      ) : (
        <section ref={followerShellRef} className={`conik-follower-shell ${fullscreen ? 'is-fullscreen' : ''}`}>
          <div
            className="conik-follower-layout"
            style={{
              display: 'grid',
              gridTemplateColumns: fullscreen && chatOpen ? 'minmax(0,1fr) 360px' : 'minmax(0,1fr)',
              gap: fullscreen ? 14 : 0,
              alignItems: 'stretch',
              height: fullscreen ? '100%' : 'auto',
            }}
          >
            <section
              className="conik-follower-video"
              style={{
                position: 'relative',
                minWidth: 0,
                background: '#090a0f',
                borderRadius: fullscreen ? '0' : 14,
                overflow: 'hidden',
              }}
            >
              <MultiLiveRoom tokenUrl="/api/lives/token" tokenBody={{ slug }} />
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label={fullscreen ? 'Quitter le plein écran' : 'Mettre le Live en plein écran'}
                style={{
                  position: 'absolute',
                  right: 12,
                  bottom: 12,
                  zIndex: 20,
                  minWidth: 42,
                  height: 42,
                  padding: '0 12px',
                  border: 0,
                  borderRadius: 11,
                  background: 'rgba(15,17,24,.9)',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  cursor: 'pointer',
                  boxShadow: '0 8px 22px rgba(0,0,0,.28)',
                }}
              >
                {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                <span style={{ fontSize: 12, fontWeight: 700 }}>{fullscreen ? 'Réduire' : 'Plein écran'}</span>
              </button>
            </section>

            {chatOpen ? (
              <section className="conik-follower-chat" style={{ position: 'relative', minWidth: 0 }}>
                <LiveChat slug={slug} chatEnabled={live.chat_enabled} />
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  aria-label="Réduire le chat"
                  style={{
                    position: 'absolute',
                    left: fullscreen ? -13 : 'auto',
                    right: fullscreen ? 'auto' : 12,
                    top: fullscreen ? 16 : 8,
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    border: '1px solid var(--line)',
                    background: 'var(--surface)',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    zIndex: 5,
                    boxShadow: '0 5px 16px rgba(0,0,0,.12)',
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </section>
            ) : (
              <aside style={{ display: 'flex', justifyContent: fullscreen ? 'flex-end' : 'flex-start', alignItems: 'center', padding: fullscreen ? '12px 0' : '8px 0' }}>
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  aria-label="Afficher le chat"
                  className="outline"
                  style={{ minHeight: 42, padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 800 }}
                >
                  <MessageSquare size={17} />
                  Chat
                  <ChevronLeft size={16} />
                </button>
              </aside>
            )}
          </div>

          <style jsx>{`
            .conik-follower-shell{background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.06)}
            .conik-follower-layout{width:100%}
            .conik-follower-video{aspect-ratio:16/9}
            .conik-follower-chat{padding:12px;background:var(--surface-2);border-top:1px solid var(--line)}
            .conik-follower-chat :global(.panel){min-height:300px;height:100%;margin:0}
            .conik-follower-shell.is-fullscreen{width:100vw;height:100vh;max-width:none;background:#090a0f;border:0;border-radius:0;box-shadow:none}
            .conik-follower-shell.is-fullscreen .conik-follower-layout{height:100%;grid-template-rows:1fr}
            .conik-follower-shell.is-fullscreen .conik-follower-video{height:100%;aspect-ratio:auto;border-radius:0}
            .conik-follower-shell.is-fullscreen .conik-follower-chat{height:100%;padding:0;border-top:0;border-left:1px solid var(--line);overflow:hidden}
            .conik-follower-shell.is-fullscreen .conik-follower-chat :global(.panel){min-height:0;height:100%;border:0;border-radius:0}
            @media(max-width:820px){
              .conik-public-live-page{padding:12px!important}
              .conik-public-live-header{padding:8px 0 12px!important}
              .conik-public-live-header h1{font-size:1.35rem!important;margin-bottom:6px}
              .conik-public-live-header p{font-size:12px;margin:4px 0}
              .conik-follower-layout{grid-template-columns:1fr!important;gap:0!important}
              .conik-follower-chat{order:2;padding:8px;background:var(--surface-2);border-top:1px solid var(--line);height:calc(100vh - 56.25vw);min-height:420px;overflow:hidden}
              .conik-follower-chat :global(.panel){height:100%;min-height:0;margin:0}
              .conik-follower-video{order:1;width:100%!important;aspect-ratio:16/9!important}
              .conik-follower-video :global(.conik-multi-live-stage){width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:16/10!important}
              .conik-follower-shell:not(.is-fullscreen) .conik-follower-layout{min-height:100vh}
              .conik-follower-shell:not(.is-fullscreen) .conik-follower-chat form{position:sticky;bottom:0;background:var(--surface-2);padding-top:8px}
              .conik-follower-shell.is-fullscreen .conik-follower-chat{height:100%;min-height:0;padding:0}
              .conik-follower-shell.is-fullscreen .conik-follower-layout{grid-template-columns:minmax(0,1fr) 320px!important;grid-template-rows:1fr!important;min-height:0}
              .conik-follower-shell.is-fullscreen .conik-follower-video{width:100%!important;height:100%!important;aspect-ratio:auto!important}
              .conik-follower-shell.is-fullscreen .conik-multi-live-stage{width:100%!important;height:100%!important;min-height:0!important;aspect-ratio:auto!important;border-radius:0!important}
            }
            :fullscreen{background:#090a0f!important;padding:0!important;border-radius:0!important}
            @media(max-width:820px) and (orientation:portrait){.conik-follower-shell.is-fullscreen{min-width:100vw;min-height:100vh}}
          `}</style>
        </section>
      )}
    </main>
  )
}
