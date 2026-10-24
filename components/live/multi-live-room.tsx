'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Camera, CameraOff, Mic, MicOff, MonitorUp, MonitorStop, Square, Volume2, Move, Maximize2, Minimize2 } from 'lucide-react'
import { Room, RoomEvent, Track } from 'livekit-client'

type Props = {
  tokenUrl: string
  tokenBody: Record<string, string>
  host?: boolean
  label?: string
  onEndLive?: () => void
  endingLive?: boolean
}

type VideoItem = { id: string; label: string; track: any; local: boolean }
type CameraSize = 'small' | 'medium' | 'large'
type Position = { x: number; y: number }

const BACKGROUNDS: Record<string, { label: string; value: string }> = {
  white: { label: 'Blanc', value: 'linear-gradient(135deg,#ffffff 0%,#f1f5f9 55%,#e2e8f0 100%)' },
  blue: { label: 'Bleu', value: 'linear-gradient(135deg,#071a3d 0%,#0b5cff 55%,#48b8ff 100%)' },
  violet: { label: 'Violet', value: 'linear-gradient(135deg,#160a35 0%,#6d28d9 55%,#b56cff 100%)' },
  cyan: { label: 'Cyan', value: 'linear-gradient(135deg,#062a35 0%,#087f9b 55%,#54e0ff 100%)' },
  dark: { label: 'Sombre', value: 'linear-gradient(135deg,#05060a 0%,#111827 55%,#273449 100%)' },
}

function VideoTile({ item, featured, selected, moveMode, size, position, onSelect, onMove }: {
  item: VideoItem
  featured: boolean
  selected: boolean
  moveMode: boolean
  size: CameraSize
  position: Position
  onSelect: () => void
  onMove: (x: number, y: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const pointerOffsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container || !item.track) return
    const video = item.track.attach() as HTMLVideoElement
    video.autoplay = true
    video.playsInline = true
    video.muted = true
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.objectFit = 'cover'
    video.style.display = 'block'
    container.appendChild(video)
    void video.play().catch(() => {})
    return () => {
      try { item.track.detach(video) } catch {}
      video.remove()
    }
  }, [item.track])

  const width = featured
    ? (size === 'large' ? 'clamp(min(100%, 280px), min(92%, 72vw), 920px)' : size === 'medium' ? 'clamp(min(100%, 220px), min(78%, 58vw), 720px)' : 'clamp(min(100%, 180px), min(68%, 48vw), 560px)')
    : size === 'large'
      ? 'clamp(140px, 42vw, 560px)'
      : size === 'medium'
        ? 'clamp(110px, 32vw, 400px)'
        : 'clamp(88px, 24vw, 280px)'

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    onSelect()
    if (!moveMode) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = true
    const rect = event.currentTarget.getBoundingClientRect()
    pointerOffsetRef.current = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return
    const parent = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!parent) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = Math.max(0, Math.min(parent.width - rect.width, event.clientX - parent.left - pointerOffsetRef.current.x))
    const y = Math.max(0, Math.min(parent.height - rect.height, event.clientY - parent.top - pointerOffsetRef.current.y))
    onMove((x / parent.width) * 100, (y / parent.height) * 100)
  }

  function stopDragging(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return
    draggingRef.current = false
    try { event.currentTarget.releasePointerCapture(event.pointerId) } catch {}
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      aria-label={`Sélectionner la caméra ${item.label}`}
      style={{
        position: 'absolute', left: `${position.x}%`, top: `${position.y}%`, width,
        aspectRatio: '16 / 9', minWidth: 0, minHeight: 0, overflow: 'hidden', borderRadius: 12,
        background: '#171922',
        border: selected ? '2px solid rgba(99,102,241,.95)' : item.local ? '2px solid rgba(255,255,255,.9)' : '1px solid rgba(255,255,255,.35)',
        boxShadow: featured ? '0 0 0 2px rgba(99,102,241,.9),0 12px 32px rgba(0,0,0,.38)' : '0 8px 24px rgba(0,0,0,.28)',
        padding: 0, cursor: moveMode ? 'grab' : 'pointer', touchAction: moveMode ? 'none' : 'auto',
        textAlign: 'left', display: 'block', zIndex: featured ? 8 : selected ? 7 : 6, userSelect: 'none'
      }}
    >
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', left: 8, bottom: 8, zIndex: 3, padding: '5px 8px', borderRadius: 7, background: 'rgba(0,0,0,.68)', color: '#fff', fontSize: 11, fontWeight: 800 }}>
        {item.label}{selected ? ' · sélectionnée' : ''}
      </div>
      {moveMode && selected && <div style={{ position: 'absolute', right: 7, top: 7, zIndex: 4, display: 'grid', placeItems: 'center', width: 25, height: 25, borderRadius: 7, background: 'rgba(0,0,0,.72)', color: '#fff' }}><Move size={14} /></div>}
    </button>
  )
}

export default function MultiLiveRoom({ tokenUrl, tokenBody, host = false, label, onEndLive, endingLive = false }: Props) {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [message, setMessage] = useState('Connexion au Live…')
  const [items, setItems] = useState<VideoItem[]>([])
  const [mic, setMic] = useState(false)
  const [camera, setCamera] = useState(false)
  const [screenTrack, setScreenTrack] = useState<any>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [backgroundId, setBackgroundId] = useState('blue')
  const [featuredId, setFeaturedId] = useState<string | null>(null)
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)
  const [cameraSize, setCameraSize] = useState<CameraSize>('medium')
  const [moveMode, setMoveMode] = useState(false)
  const [cameraPositions, setCameraPositions] = useState<Record<string, Position>>({})
  const cameraPositionsRef = useRef<Record<string, Position>>({})
  const roomRef = useRef<Room | null>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const background = BACKGROUNDS[backgroundId] || BACKGROUNDS.blue

  useEffect(() => {
    let cancelled = false
    const room = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = room

    const upsert = (item: VideoItem) => {
      setItems((current) => {
        const existing = current.find((x) => x.id === item.id)
        if (existing && existing.track === item.track && existing.label === item.label && existing.local === item.local) return current
        return [...current.filter((x) => x.id !== item.id), item]
      })
    }
    const remove = (id: string) => {
      setItems((current) => current.filter((x) => x.id !== id))
      setFeaturedId((current) => current === id ? null : current)
      setSelectedCameraId((current) => current === id ? null : current)
      setCameraPositions((current) => {
        const next = { ...current }
        delete next[id]
        cameraPositionsRef.current = next
        return next
      })
    }
    const participantLabel = (participant: any) => participant.name || (String(participant.identity).startsWith('cohost-') ? 'Co-organisateur' : 'Organisateur principal')
    const publishLayout = (positions: Record<string, Position>) => {
      const payload = new TextEncoder().encode(JSON.stringify({ type: 'camera-layout-sync', positions }))
      void room.localParticipant.publishData(payload, { reliable: true, topic: 'conik-camera-layout' }).catch(() => {})
    }
    const handleLayoutData = (payload: Uint8Array, participant: any) => {
      if (participant?.identity === room.localParticipant.identity) return
      try {
        const message = JSON.parse(new TextDecoder().decode(payload))
        if (message?.type === 'camera-layout-request') {
          publishLayout(cameraPositionsRef.current)
          return
        }
        if (message?.type !== 'camera-layout-sync' || !message.positions || typeof message.positions !== 'object') return
        const incoming: Record<string, Position> = {}
        for (const [id, position] of Object.entries(message.positions as Record<string, Position>)) {
          if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') continue
          incoming[id] = {
            x: Math.max(0, Math.min(100, position.x)),
            y: Math.max(0, Math.min(100, position.y)),
          }
        }
        if (!Object.keys(incoming).length) return
        setCameraPositions((current) => {
          const next = { ...current, ...incoming }
          cameraPositionsRef.current = next
          return next
        })
      } catch {}
    }
    const requestLayoutSync = () => {
      const payload = new TextEncoder().encode(JSON.stringify({ type: 'camera-layout-request' }))
      void room.localParticipant.publishData(payload, { reliable: true, topic: 'conik-camera-layout' }).catch(() => {})
    }

    const attachAudio = (track: any) => {
      if (!track || track.kind !== Track.Kind.Audio) return
      const el = track.attach() as HTMLMediaElement
      el.autoplay = true; el.muted = false; el.volume = 1; el.style.display = 'none'
      document.body.appendChild(el)
      void el.play().catch(() => { if (!cancelled) setAudioBlocked(true) })
    }
    const handleSubscribed = (track: any, publication: any, participant: any) => {
      if (track.kind === Track.Kind.Audio) { attachAudio(track); return }
      if (publication.source === Track.Source.ScreenShare) { setScreenTrack(track); return }
      if (publication.source === Track.Source.Camera) upsert({ id: participant.identity, label: participantLabel(participant), track, local: false })
    }

    room.on(RoomEvent.DataReceived, handleLayoutData)
    room.on(RoomEvent.TrackSubscribed, handleSubscribed)
    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      track.detach().forEach((el) => el.remove())
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(null)
      if (publication.source === Track.Source.Camera) remove(participant.identity)
    })
    room.on(RoomEvent.TrackPublished, (publication, participant) => {
      if (publication.source === Track.Source.ScreenShare && publication.isSubscribed && publication.track) setScreenTrack(publication.track)
      if (publication.source === Track.Source.Camera && publication.isSubscribed && publication.track) upsert({ id: participant.identity, label: participantLabel(participant), track: publication.track, local: false })
    })
    room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
      if (publication.source === Track.Source.Camera) remove(participant.identity)
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(null)
    })
    room.on(RoomEvent.ParticipantDisconnected, (participant) => remove(participant.identity))
    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (!host || !publication.track) return
      if (publication.source === Track.Source.Camera) upsert({ id: room.localParticipant.identity, label: label || 'Organisateur principal', track: publication.track, local: true })
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(publication.track)
    })
    room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      if (publication.source === Track.Source.Camera) remove(room.localParticipant.identity)
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(null)
    })

    ;(async () => {
      try {
        const response = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tokenBody) })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Impossible de préparer la connexion.')
        if (!data.url || !data.token) throw new Error('Réponse LiveKit invalide (url/token manquants).')
        await room.connect(data.url, data.token)
        if (cancelled) return
        setStatus('connected')
        requestLayoutSync()
        setMessage(host ? 'Vous êtes connecté au studio.' : 'Vous êtes connecté au Live.')

        if (host) {
          try { await room.localParticipant.setMicrophoneEnabled(true); if (!cancelled) setMic(true) } catch { if (!cancelled) setMessage('Microphone non disponible.') }
          try { await room.localParticipant.setCameraEnabled(true); if (!cancelled) setCamera(true) } catch (err) {
            if (!cancelled) {
              const name = err instanceof Error ? err.name : ''
              const msg = err instanceof Error ? err.message : ''
              if (name === 'NotAllowedError' || /Permission|NotAllowed/i.test(msg)) setMessage('Autorisez la caméra dans le navigateur, puis activez la caméra.')
              else if (name === 'NotFoundError' || /NotFound|device/i.test(msg)) setMessage('Aucune caméra détectée sur cet appareil.')
              else setMessage(msg || 'Caméra non disponible.')
            }
          }
        } else {
          try { await room.startAudio(); setAudioBlocked(false) } catch { setAudioBlocked(true) }
        }

        room.remoteParticipants.forEach((participant: any) => {
          participant.trackPublications.forEach((publication: any) => {
            if (publication.source === Track.Source.Camera && publication.isSubscribed && publication.track) upsert({ id: participant.identity, label: participantLabel(participant), track: publication.track, local: false })
            if (publication.source === Track.Source.ScreenShare && publication.isSubscribed && publication.track) setScreenTrack(publication.track)
          })
        })
      } catch (error) {
        if (!cancelled) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Connexion impossible.') }
      }
    })()

    return () => { cancelled = true; room.disconnect(); roomRef.current = null }
  }, [tokenUrl, JSON.stringify(tokenBody), host, label])

  useEffect(() => {
    const container = screenRef.current
    if (!container || !screenTrack) return
    const el = screenTrack.attach() as HTMLVideoElement
    el.autoplay = true; el.playsInline = true; el.muted = true; el.style.width = '100%'; el.style.height = '100%'; el.style.objectFit = 'contain'; el.style.display = 'block'
    container.appendChild(el)
    return () => { try { screenTrack.detach(el) } catch {}; el.remove() }
  }, [screenTrack])

  const sortedItems = useMemo(() => {
    const list = [...items.filter((item) => item.local), ...items.filter((item) => !item.local)]
    if (!featuredId) return list
    const featured = list.find((item) => item.id === featuredId)
    return featured ? [featured, ...list.filter((item) => item.id !== featuredId)] : list
  }, [items, featuredId])

  const selectedItem = selectedCameraId ? items.find((item) => item.id === selectedCameraId) : null
  const activeCameraId = selectedItem ? selectedItem.id : sortedItems[0]?.id || null

  async function toggleMic() {
    const room = roomRef.current
    if (!room || !host) return
    try { const next = !mic; await room.localParticipant.setMicrophoneEnabled(next); setMic(next) } catch {}
  }

  async function toggleCamera() {
    const room = roomRef.current
    if (!room || !host) return
    try { const next = !camera; await room.localParticipant.setCameraEnabled(next); setCamera(next); if (next) setMessage('Caméra activée.') }
    catch (err) { setMessage(err instanceof Error ? err.message : "Impossible d'activer la caméra.") }
  }

  async function toggleScreen() {
    const room = roomRef.current
    if (!room || !host) return
    try {
      if (screenTrack) { await room.localParticipant.setScreenShareEnabled(false); setScreenTrack(null); return }
      if (!window.isSecureContext || !navigator.mediaDevices?.getDisplayMedia) throw new Error("Le partage d'écran nécessite HTTPS et un navigateur compatible.")
      await room.localParticipant.setScreenShareEnabled(true, { audio: false, video: true, selfBrowserSurface: 'exclude', surfaceSwitching: 'include' })
    } catch (error) { setMessage(error instanceof Error ? error.message : "Impossible de partager l'écran.") }
  }

  function toggleFeature() {
    if (!activeCameraId) return
    setFeaturedId((current) => current === activeCameraId ? null : activeCameraId)
    setMoveMode(false)
    if (activeCameraId) setCameraSize('large')
  }

  function toggleCameraSize() {
    if (!activeCameraId) return
    setSelectedCameraId(activeCameraId)
    setCameraSize((current) => current === 'small' ? 'medium' : current === 'medium' ? 'large' : 'small')
  }

  function toggleMoveMode() {
    if (!activeCameraId) return
    setSelectedCameraId(activeCameraId)
    setMoveMode((current) => !current)
  }

  function moveCamera(id: string, x: number, y: number) {
    const nextPosition = { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
    setCameraPositions((current) => {
      const next = { ...current, [id]: nextPosition }
      cameraPositionsRef.current = next
      return next
    })
    const room = roomRef.current
    if (!room) return
    const payload = new TextEncoder().encode(JSON.stringify({
      type: 'camera-layout-sync',
      positions: { [id]: nextPosition },
    }))
    void room.localParticipant.publishData(payload, { reliable: true, topic: 'conik-camera-layout' }).catch(() => {})
  }

  const stageBackground = screenTrack ? '#000' : background.value
  const overlayBtn: React.CSSProperties = {
    minHeight: 40, minWidth: 40, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    fontSize: 12, fontWeight: 700, color: '#fff', border: '1px solid rgba(255,255,255,.18)', borderRadius: 11,
    background: 'rgba(15,23,42,.72)', cursor: 'pointer', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none',
  }

  const responsiveCss = `
.conik-multi-live{width:100%;min-width:0;box-sizing:border-box}
.conik-live-stage{width:100%!important;box-sizing:border-box}
.conik-live-controls button span{white-space:nowrap}
@media (min-width:1280px){.conik-live-stage{height:min(78vh,820px)!important;max-height:calc(100dvh - 120px)!important;min-height:420px!important}}
@media (min-width:1024px) and (max-width:1279px){.conik-live-stage{height:min(70vh,700px)!important;max-height:calc(100dvh - 130px)!important;min-height:360px!important}}
@media (max-width:1023px) and (min-width:641px){.conik-live-stage{height:min(58vh,560px)!important;max-height:calc(100dvh - 160px)!important;min-height:300px!important;border-radius:14px!important}}
@media (max-width:640px){
  .conik-multi-live{gap:8px!important}
  .conik-live-stage{height:auto!important;min-height:0!important;max-height:none!important;aspect-ratio:16/9!important;border-radius:12px!important;box-shadow:0 10px 28px rgba(0,0,0,.22)!important}
  .conik-live-controls{left:6px!important;right:6px!important;bottom:max(6px, env(safe-area-inset-bottom))!important;padding:6px 8px!important;gap:4px!important;border-radius:12px!important}
  .conik-live-controls button{min-height:44px!important;min-width:44px!important;padding:0 8px!important;border-radius:12px!important}
  .conik-live-controls button span{display:none!important}
  .conik-live-hint{display:none!important}
}
@media (max-width:390px){.conik-live-stage{aspect-ratio:4/3!important}.conik-live-controls button{min-height:42px!important;min-width:40px!important;padding:0 6px!important}}
@supports (height:100dvh){@media (min-width:641px){.conik-live-stage{max-height:calc(100dvh - 140px)!important}}}
`

  return (
    <div className="conik-multi-live" style={{ display: 'grid', gap: 10, width: '100%', minWidth: 0, maxWidth: '100%' }}>
      <style>{responsiveCss}</style>
      {host && status === 'connected' && (
        <div className="conik-live-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 14, border: '1px solid var(--line)', background: 'var(--panel)', boxShadow: '0 8px 24px rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: '#e11d48', color: '#fff', fontSize: 11, fontWeight: 800 }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: '#fff' }} />
              EN DIRECT
            </span>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{label || 'Studio régie'}</span>
            <span className="muted" style={{ fontSize: 11 }}>{message}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span className="muted" style={{ fontSize: 11, fontWeight: 700 }}>Fond</span>
            {Object.entries(BACKGROUNDS).map(([id, item]) => (
              <button key={id} type="button" title={item.label} aria-label={item.label} onClick={() => setBackgroundId(id)} style={{ width: 22, height: 22, borderRadius: 7, border: backgroundId === id ? '2px solid var(--text)' : '1px solid var(--line)', background: item.value, cursor: 'pointer', padding: 0 }} />
            ))}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.35)', fontSize: 12, fontWeight: 600 }}>{message}</div>
      )}

      <div className="conik-live-stage" style={{ position: 'relative', width: '100%', margin: '0 auto', minHeight: 240, height: 'min(72vh, 760px)', maxHeight: 'calc(100dvh - 140px)', overflow: 'hidden', borderRadius: 18, background: stageBackground, border: '1px solid rgba(255,255,255,.12)', boxShadow: '0 20px 50px rgba(0,0,0,.28)' }}>
        {!screenTrack && !sortedItems.length && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', opacity: .85, zIndex: 2, textAlign: 'center', padding: 20 }}>
            <div>
              <div style={{ width: 56, height: 56, margin: '0 auto 12px', borderRadius: 999, border: '2px solid rgba(255,255,255,.35)', display: 'grid', placeItems: 'center' }}><Camera size={22} /></div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{status === 'connected' ? 'En attente des caméras…' : message}</div>
              <div style={{ fontSize: 12, opacity: .75, marginTop: 4 }}>WebRTC LiveKit · latence basse</div>
            </div>
          </div>
        )}
        {screenTrack && <div ref={screenRef} style={{ position: 'absolute', inset: 0, zIndex: 1, background: '#000', padding: 4, overflow: 'hidden' }} />}
        {sortedItems.length > 0 && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 5, overflow: 'hidden' }}>
            {sortedItems.map((item, index) => (
              <VideoTile key={`${item.id}-${item.track?.sid || ''}`} item={item} featured={featuredId === item.id} selected={selectedCameraId === item.id} moveMode={moveMode && selectedCameraId === item.id} size={cameraSize} position={cameraPositions[item.id] || { x: 2 + (index % 3) * 33, y: screenTrack ? 72 + Math.floor(index / 3) * 14 : 2 + Math.floor(index / 3) * 32 }} onSelect={() => setSelectedCameraId(item.id)} onMove={(x, y) => moveCamera(item.id, x, y)} />
            ))}
          </div>
        )}

        {host && status === 'connected' && (
          <div className="conik-live-controls" style={{ position: 'absolute', left: 8, right: 8, bottom: 'max(8px, env(safe-area-inset-bottom))', zIndex: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 14, background: 'rgba(2,6,23,.78)', border: '1px solid rgba(255,255,255,.12)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => void toggleMic()} style={{ ...overlayBtn, background: mic ? 'rgba(15,23,42,.72)' : 'rgba(225,29,72,.85)' }}>{mic ? <Mic size={16} /> : <MicOff size={16} />}</button>
              <button type="button" onClick={() => void toggleCamera()} style={{ ...overlayBtn, background: camera ? 'rgba(15,23,42,.72)' : 'rgba(225,29,72,.85)' }}>{camera ? <Camera size={16} /> : <CameraOff size={16} />}</button>
              <button type="button" onClick={toggleMoveMode} disabled={!activeCameraId} style={{ ...overlayBtn, opacity: activeCameraId ? 1 : .45, background: moveMode ? 'rgba(99,102,241,.85)' : overlayBtn.background }}><Move size={16} /> <span style={{ fontSize: 11 }}>{moveMode ? 'OK' : 'Déplacer'}</span></button>
              <button type="button" onClick={toggleFeature} disabled={!activeCameraId} style={{ ...overlayBtn, opacity: activeCameraId ? 1 : .45 }}><Maximize2 size={16} /> <span style={{ fontSize: 11 }}>{featuredId === activeCameraId ? 'Réduire' : 'Avant'}</span></button>
              <button type="button" onClick={toggleCameraSize} disabled={!activeCameraId} style={{ ...overlayBtn, opacity: activeCameraId ? 1 : .45 }}>{cameraSize === 'large' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}<span style={{ fontSize: 11 }}>{cameraSize === 'small' ? 'S' : cameraSize === 'medium' ? 'M' : 'L'}</span></button>
              <button type="button" onClick={() => void toggleScreen()} style={overlayBtn}>{screenTrack ? <MonitorStop size={16} /> : <MonitorUp size={16} />}</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedItem && <span style={{ fontSize: 11, color: 'rgba(255,255,255,.8)', fontWeight: 600 }}>{selectedItem.label} · {cameraSize.toUpperCase()}</span>}
              {onEndLive && <button type="button" onClick={onEndLive} disabled={endingLive} style={{ ...overlayBtn, background: 'rgba(185,28,28,.9)', border: '1px solid rgba(248,113,113,.5)', fontWeight: 800 }}><Square size={14} fill="currentColor" /> {endingLive ? 'Arrêt…' : 'Couper'}</button>}
            </div>
          </div>
        )}
      </div>

      {host && status === 'connected' && (
        <p className="muted conik-live-hint" style={{ textAlign: 'center', fontSize: 11, margin: 0, padding: '0 8px' }}>
          Sélectionne une caméra → <b>Avant</b> pour l’agrandir · <b>S/M/L</b> pour la taille · <b>Déplacer</b> puis glisse.
        </p>
      )}

      {!host && audioBlocked && status === 'connected' && (
        <button className="outline" onClick={() => void roomRef.current?.startAudio().then(() => setAudioBlocked(false)).catch(() => {})} style={{ justifySelf: 'center', minHeight: 36, padding: '0 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Volume2 size={14} /> Activer le son
        </button>
      )}
    </div>
  )
}
