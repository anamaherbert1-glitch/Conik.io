'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  CameraOff,
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  MonitorUp,
  MonitorStop,
  Move,
  Volume2,
  BringToFront,
  Palette,
} from 'lucide-react'
import { Room, RoomEvent, Track } from 'livekit-client'

type Props = { tokenUrl: string; tokenBody: Record<string, string>; host?: boolean; label?: string }
type VideoItem = { id: string; label: string; track: any; local: boolean }

type StageState = {
  featured: string | null
  movable: boolean
  front: boolean
  x: number
  y: number
  minimized: boolean
  backgroundId: string
}

const BACKGROUNDS: Record<string, { label: string; value: string }> = {
  white: { label: 'Blanc', value: 'linear-gradient(135deg,#ffffff 0%,#f1f5f9 55%,#e2e8f0 100%)' },
  blue: { label: 'Bleu', value: 'linear-gradient(135deg,#071a3d 0%,#0b5cff 55%,#48b8ff 100%)' },
  violet: { label: 'Violet', value: 'linear-gradient(135deg,#160a35 0%,#6d28d9 55%,#b56cff 100%)' },
  cyan: { label: 'Cyan', value: 'linear-gradient(135deg,#062a35 0%,#087f9b 55%,#54e0ff 100%)' },
  dark: { label: 'Sombre', value: 'linear-gradient(135deg,#05060a 0%,#111827 55%,#273449 100%)' },
}

const DEFAULT_STAGE: StageState = {
  featured: null,
  movable: false,
  front: false,
  x: 88,
  y: 82,
  minimized: true,
  backgroundId: 'blue',
}

function normalizeStage(next: Partial<StageState> | null | undefined): StageState {
  return {
    featured: typeof next?.featured === 'string' ? next.featured : null,
    movable: Boolean(next?.movable),
    front: Boolean(next?.front),
    minimized: next?.minimized !== false,
    x: Number.isFinite(next?.x) ? Math.max(3, Math.min(97, Number(next?.x))) : DEFAULT_STAGE.x,
    y: Number.isFinite(next?.y) ? Math.max(3, Math.min(97, Number(next?.y))) : DEFAULT_STAGE.y,
    backgroundId:
      typeof next?.backgroundId === 'string' && BACKGROUNDS[next.backgroundId]
        ? next.backgroundId
        : DEFAULT_STAGE.backgroundId,
  }
}

export default function MultiLiveRoom({ tokenUrl, tokenBody, host = false, label }: Props) {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [message, setMessage] = useState('Connexion au Live…')
  const [items, setItems] = useState<VideoItem[]>([])
  const [stage, setStage] = useState<StageState>(DEFAULT_STAGE)
  const [mic, setMic] = useState(false)
  const [camera, setCamera] = useState(false)
  const [screenTrack, setScreenTrack] = useState<any>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [moveMode, setMoveMode] = useState(false)
  const roomRef = useRef<Room | null>(null)
  const videoRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const screenRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const stageRefState = useRef<StageState>(DEFAULT_STAGE)
  const draggingRef = useRef(false)

  const sendStage = (next: StageState) => {
    const safe = normalizeStage(next)
    stageRefState.current = safe
    setStage(safe)
    if (!host) return
    const room = roomRef.current
    if (!room) return
    try {
      void room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({ type: 'conik-stage-state', stage: safe })),
        { reliable: true, topic: 'conik-stage-state' },
      )
    } catch {}
  }

  useEffect(() => {
    let cancelled = false
    const room = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = room
    const upsert = (item: VideoItem) => setItems((current) => [...current.filter((x) => x.id !== item.id), item])
    const remove = (id: string) => setItems((current) => current.filter((x) => x.id !== id))

    const attachAudio = (track: any) => {
      if (!track || track.kind !== Track.Kind.Audio) return
      const el = track.attach() as HTMLMediaElement
      el.autoplay = true
      el.muted = false
      el.volume = 1
      el.style.display = 'none'
      document.body.appendChild(el)
      void el.play().catch(() => {
        if (!cancelled) setAudioBlocked(true)
      })
    }

    const onParticipant = (participant: any) =>
      participant.name || (participant.identity.startsWith('cohost-') ? 'Co-organisateur' : 'Organisateur')

    // Sync scène organisateur → tous les participants (followers inclus)
    room.on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
      if (topic !== 'conik-stage-state') return
      try {
        const data = JSON.parse(new TextDecoder().decode(payload))
        if (data?.type !== 'conik-stage-state' || !data.stage) return
        const safe = normalizeStage(data.stage)
        stageRefState.current = safe
        setStage(safe)
        if (!host) setMoveMode(false)
      } catch {}
    })

    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        attachAudio(track)
        return
      }
      if (publication.source === Track.Source.ScreenShare) {
        setScreenTrack(track)
        return
      }
      if (publication.source !== Track.Source.Camera) return
      upsert({ id: participant.identity, label: onParticipant(participant), track, local: false })
    })

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      track.detach().forEach((el) => el.remove())
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(null)
      if (publication.source === Track.Source.Camera) remove(participant.identity)
    })

    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (!host || !publication.track) return
      if (publication.source === Track.Source.Camera) {
        upsert({
          id: room.localParticipant.identity,
          label: label || 'Organisateur principal',
          track: publication.track,
          local: true,
        })
        if (!stageRefState.current.featured) {
          sendStage({
            ...stageRefState.current,
            featured: room.localParticipant.identity,
            minimized: true,
            front: false,
            movable: false,
          })
        }
      }
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(publication.track)
    })

    room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      if (publication.source === Track.Source.Camera) remove(room.localParticipant.identity)
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(null)
      publication.track?.detach().forEach((el: any) => el.remove())
    })

    ;(async () => {
      try {
        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tokenBody),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Impossible de préparer la connexion.')
        await room.connect(data.url, data.token)
        if (cancelled) return
        setStatus('connected')
        setMessage(host ? 'Vous êtes connecté au studio.' : 'Vous êtes connecté au Live.')

        if (!host) {
          try {
            await room.startAudio()
            setAudioBlocked(false)
          } catch {
            setAudioBlocked(true)
          }
        } else {
          try {
            await room.localParticipant.setMicrophoneEnabled(true)
            if (!cancelled) setMic(true)
          } catch {
            setMessage('Microphone non disponible.')
          }
          try {
            await room.localParticipant.setCameraEnabled(true)
            if (!cancelled) setCamera(true)
          } catch {
            setMessage('Caméra non disponible.')
          }
          // Envoyer l’état de scène dès la connexion
          setTimeout(() => sendStage(stageRefState.current), 250)
          setTimeout(() => sendStage(stageRefState.current), 1200)
        }
      } catch (error) {
        if (!cancelled) {
          setStatus('error')
          setMessage(error instanceof Error ? error.message : 'Connexion impossible.')
        }
      }
    })()

    // Resync périodique pour les followers qui rejoignent en retard
    const syncTimer = host
      ? window.setInterval(() => {
          try {
            void room.localParticipant.publishData(
              new TextEncoder().encode(
                JSON.stringify({ type: 'conik-stage-state', stage: stageRefState.current }),
              ),
              { reliable: true, topic: 'conik-stage-state' },
            )
          } catch {}
        }, 1500)
      : undefined

    return () => {
      cancelled = true
      if (syncTimer) window.clearInterval(syncTimer)
      room.disconnect()
    }
  }, [tokenUrl, JSON.stringify(tokenBody), host, label])

  // Attacher les vidéos caméra
  useEffect(() => {
    items.forEach((item) => {
      const container = videoRefs.current[item.id]
      if (!container) return
      container.querySelectorAll('video').forEach((v) => v.remove())
      const el = item.track.attach() as HTMLVideoElement
      el.autoplay = true
      el.playsInline = true
      el.muted = item.local || host
      el.style.width = '100%'
      el.style.height = '100%'
      el.style.objectFit = 'cover'
      el.style.display = 'block'
      el.style.borderRadius = '10px'
      container.appendChild(el)
    })
  }, [items, host])

  // Attacher le partage d’écran (visible organisateur ET followers)
  useEffect(() => {
    const container = screenRef.current
    if (!container || !screenTrack) return
    container.querySelectorAll('video').forEach((v) => v.remove())
    const el = screenTrack.attach() as HTMLVideoElement
    el.autoplay = true
    el.playsInline = true
    el.muted = true
    el.style.width = '100%'
    el.style.height = '100%'
    el.style.objectFit = 'contain'
    el.style.display = 'block'
    container.appendChild(el)
    return () => {
      screenTrack.detach().forEach((node: any) => node.remove())
    }
  }, [screenTrack])

  async function toggleMic() {
    const room = roomRef.current
    if (!room || !host) return
    try {
      const next = !mic
      await room.localParticipant.setMicrophoneEnabled(next)
      setMic(next)
    } catch {}
  }

  async function toggleCamera() {
    const room = roomRef.current
    if (!room || !host) return
    try {
      const next = !camera
      await room.localParticipant.setCameraEnabled(next)
      setCamera(next)
    } catch {}
  }

  async function toggleScreen() {
    const room = roomRef.current
    if (!room || !host) return
    try {
      if (screenTrack) {
        await room.localParticipant.setScreenShareEnabled(false)
        setScreenTrack(null)
        return
      }
      if (!window.isSecureContext || !navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Le partage d’écran nécessite HTTPS et un navigateur compatible.')
      }
      await room.localParticipant.setScreenShareEnabled(true, {
        audio: false,
        video: true,
        selfBrowserSurface: 'exclude',
        surfaceSwitching: 'include',
      })
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Impossible de partager l’écran.')
    }
  }

  function setBackground(id: string) {
    if (!host || !BACKGROUNDS[id]) return
    sendStage({ ...stage, backgroundId: id })
  }

  function toggleMinimize(id: string) {
    if (!host) return
    if (stage.featured !== id) {
      sendStage({ ...stage, featured: id, minimized: true, front: false, movable: false })
      setMoveMode(false)
      return
    }
    sendStage({ ...stage, minimized: !stage.minimized, front: stage.minimized ? false : stage.front })
  }

  function toggleBringToFront(id: string) {
    if (!host) return
    const same = stage.featured === id && stage.front && !stage.minimized
    sendStage({
      ...stage,
      featured: same ? null : id,
      front: !same,
      minimized: false,
      movable: false,
    })
    setMoveMode(false)
  }

  function toggleMove(id: string) {
    if (!host) return
    if (stage.featured !== id) {
      sendStage({ ...stage, featured: id, front: false, movable: true, minimized: stage.minimized })
      setMoveMode(true)
      return
    }
    const next = !moveMode
    setMoveMode(next)
    sendStage({ ...stage, movable: next })
  }

  function selectCamera(id: string) {
    if (!host) return
    if (stage.featured === id) return
    sendStage({ ...stage, featured: id, front: false, movable: false, minimized: true })
    setMoveMode(false)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!host || !moveMode || !stage.featured) return
    draggingRef.current = true
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!host || !moveMode || !stage.featured || !stageRef.current || !draggingRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const x = Math.max(3, Math.min(97, ((event.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(3, Math.min(97, ((event.clientY - rect.top) / rect.height) * 100))
    sendStage({ ...stage, x, y })
  }

  function handlePointerUp() {
    draggingRef.current = false
  }

  const count = items.length
  const columns =
    count <= 1
      ? '1fr'
      : count === 2
        ? 'repeat(2,minmax(0,1fr))'
        : count <= 4
          ? 'repeat(2,minmax(0,1fr))'
          : 'repeat(3,minmax(0,1fr))'

  const featuredItem = useMemo(
    () => items.find((item) => item.id === stage.featured) || null,
    [items, stage.featured],
  )
  const normalItems = useMemo(
    () => items.filter((item) => item.id !== stage.featured),
    [items, stage.featured],
  )

  const bg = BACKGROUNDS[stage.backgroundId] || BACKGROUNDS.blue
  const showWatermark = !screenTrack // filigrane seulement sans partage d’écran

  const renderTile = (item: VideoItem, floating = false) => (
    <div
      key={item.id}
      ref={(el) => {
        videoRefs.current[item.id] = el
      }}
      onClick={() => selectCamera(item.id)}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        borderRadius: 10,
        background: '#171922',
        border: stage.featured === item.id ? '2px solid rgba(255,255,255,.9)' : '1px solid rgba(255,255,255,.16)',
        cursor: host ? 'pointer' : 'default',
        boxShadow: floating ? '0 12px 28px rgba(0,0,0,.42)' : '0 8px 24px rgba(0,0,0,.22)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 6,
          bottom: 6,
          zIndex: 3,
          padding: '4px 7px',
          borderRadius: 7,
          background: 'rgba(0,0,0,.68)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 800,
        }}
      >
        {item.label}
      </div>
      {host && floating && (
        <div style={{ position: 'absolute', right: 6, top: 6, zIndex: 5, display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleMinimize(item.id)
            }}
            title={stage.minimized ? 'Agrandir la caméra' : 'Réduire la caméra'}
            style={btnStyle}
          >
            {stage.minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleMove(item.id)
            }}
            title="Déplacer"
            style={{
              ...btnStyle,
              background: moveMode && stage.featured === item.id ? 'rgba(255,255,255,.92)' : 'rgba(0,0,0,.68)',
              color: moveMode && stage.featured === item.id ? '#111' : '#fff',
            }}
          >
            <Move size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleBringToFront(item.id)
            }}
            title="Mettre en avant"
            style={{
              ...btnStyle,
              background:
                stage.front && stage.featured === item.id && !stage.minimized
                  ? 'rgba(255,255,255,.92)'
                  : 'rgba(0,0,0,.68)',
              color:
                stage.front && stage.featured === item.id && !stage.minimized ? '#111' : '#fff',
            }}
          >
            <BringToFront size={14} />
          </button>
        </div>
      )}
    </div>
  )

  const pipW = stage.minimized ? 'clamp(78px,10vw,108px)' : 'clamp(210px,32vw,390px)'
  const pipH = stage.minimized ? 'clamp(46px,6.2vw,62px)' : 'clamp(118px,18vw,220px)'

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div
        ref={stageRef}
        className="conik-multi-live-stage"
        data-conik-studio-stage
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          minHeight: 0,
          overflow: 'hidden',
          borderRadius: 14,
          background: screenTrack ? '#000' : bg.value,
          border: '1px solid var(--line)',
        }}
      >
        {/* Arrière-plan + filigrane Conik.io (sync organisateur → followers) */}
        {!screenTrack && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              background: bg.value,
              pointerEvents: 'none',
            }}
          />
        )}
        {showWatermark && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gridTemplateRows: 'repeat(4,1fr)',
              placeItems: 'center',
              opacity: 0.14,
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <span
                key={i}
                style={{
                  color: '#fff',
                  fontSize: 'clamp(16px,2.8vw,30px)',
                  fontWeight: 900,
                  letterSpacing: '.08em',
                  transform: 'rotate(-24deg)',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Conik.io
              </span>
            ))}
          </div>
        )}

        <div data-conik-remote-canvas style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', minHeight: 0, zIndex: 1 }}>
          {status !== 'connected' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                padding: 24,
                textAlign: 'center',
                zIndex: 20,
              }}
            >
              <b>{message}</b>
            </div>
          )}

          {status === 'connected' && items.length === 0 && !screenTrack && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                opacity: 0.75,
                zIndex: 2,
              }}
            >
              En attente des caméras…
            </div>
          )}

          {/* Partage d’écran plein cadre — visible pour tous */}
          {screenTrack && (
            <div
              ref={screenRef}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                borderRadius: 12,
                overflow: 'hidden',
                background: '#000',
                padding: 4,
              }}
            />
          )}

          {/* Grille caméras (sans partage d’écran) */}
          {!screenTrack && normalItems.length > 0 && (
            <div
              style={{
                position: 'absolute',
                inset: 8,
                display: 'grid',
                gridTemplateColumns: columns,
                gap: 6,
                zIndex: 2,
              }}
            >
              {normalItems.map((item) => renderTile(item))}
            </div>
          )}

          {/* Caméra PiP (petite/grande) — même position/taille côté followers */}
          {featuredItem && (
            <div
              style={{
                position: 'absolute',
                left: `${stage.x}%`,
                top: `${stage.y}%`,
                width: pipW,
                height: pipH,
                zIndex: 10,
                transform: 'translate(-50%,-50%)',
                touchAction: moveMode && host ? 'none' : 'auto',
                transition: moveMode ? 'none' : 'width .18s ease,height .18s ease',
              }}
            >
              {renderTile(featuredItem, true)}
            </div>
          )}

          {/* Autres caméras en pastilles pendant le partage d’écran */}
          {screenTrack && normalItems.length > 0 && (
            <div
              style={{
                position: 'absolute',
                left: 8,
                bottom: 8,
                zIndex: 8,
                display: 'flex',
                gap: 6,
                maxWidth: '70%',
                overflowX: 'auto',
              }}
            >
              {normalItems.map((item) => (
                <div key={item.id} style={{ width: 72, height: 48, flex: '0 0 auto' }}>
                  {renderTile(item)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {host && status === 'connected' && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="outline" onClick={() => void toggleMic()} style={ctrlBtn}>
            {mic ? <Mic size={17} /> : <MicOff size={17} />} {mic ? 'Couper le micro' : 'Activer le micro'}
          </button>
          <button className="outline" onClick={() => void toggleCamera()} style={ctrlBtn}>
            {camera ? <Camera size={17} /> : <CameraOff size={17} />}{' '}
            {camera ? 'Couper la caméra' : 'Activer la caméra'}
          </button>
          <button className="outline" onClick={() => void toggleScreen()} style={ctrlBtn}>
            {screenTrack ? <MonitorStop size={17} /> : <MonitorUp size={17} />}{' '}
            {screenTrack ? 'Arrêter le partage' : 'Partager mon écran'}
          </button>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
            <Palette size={15} style={{ opacity: 0.7 }} />
            {Object.entries(BACKGROUNDS).map(([id, item]) => (
              <button
                key={id}
                type="button"
                title={item.label}
                aria-label={item.label}
                onClick={() => setBackground(id)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: stage.backgroundId === id ? '2px solid var(--text)' : '1px solid var(--line)',
                  background: item.value,
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {!host && audioBlocked && status === 'connected' && (
        <button
          onClick={() =>
            void roomRef.current
              ?.startAudio()
              .then(() => setAudioBlocked(false))
              .catch(() => {})
          }
          style={{
            minHeight: 44,
            border: 0,
            borderRadius: 10,
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Volume2 size={17} />
          Activer le son
        </button>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  border: 0,
  borderRadius: 7,
  background: 'rgba(0,0,0,.68)',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
}

const ctrlBtn: React.CSSProperties = {
  minHeight: 44,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
}
