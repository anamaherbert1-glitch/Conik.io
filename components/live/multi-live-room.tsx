'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
type CameraSize = 'small' | 'medium'
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

  const width = featured ? 'clamp(260px,42%,460px)' : size === 'medium' ? 'clamp(210px,30%,360px)' : 'clamp(130px,30%,360px)'

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
  const [cameraSize, setCameraSize] = useState<CameraSize>('small')
  const [moveMode, setMoveMode] = useState(false)
  const [cameraPositions, setCameraPositions] = useState<Record<string, Position>>({})
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
      setCameraPositions((current) => { const next = { ...current }; delete next[id]; return next })
    }
    const participantLabel = (participant: any) => participant.name || (String(participant.identity).startsWith('cohost-') ? 'Co-organisateur' : 'Organisateur principal')
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
  }

  function toggleCameraSize() {
    if (!activeCameraId || featuredId === activeCameraId) return
    setCameraSize((current) => current === 'small' ? 'medium' : 'small')
  }

  function toggleMoveMode() {
    if (!activeCameraId) return
    setSelectedCameraId(activeCameraId)
    setMoveMode((current) => !current)
  }

  function moveCamera(id: string, x: number, y: number) {
    setCameraPositions((current) => ({ ...current, [id]: { x, y } }))
  }

  const stageBackground = screenTrack ? '#000' : background.value
  const controlButtonStyle = { minHeight: 36, padding: '0 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 10, whiteSpace: 'nowrap' as const }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {host && status === 'connected' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', padding: '6px 8px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel)' }}>
          <span className="muted" style={{ fontSize: 11, fontWeight: 800 }}>Arrière-plan</span>
          {Object.entries(BACKGROUNDS).map(([id, item]) => <button key={id} type="button" title={item.label} aria-label={item.label} onClick={() => setBackgroundId(id)} style={{ width: 24, height: 24, borderRadius: 7, border: backgroundId === id ? '2px solid var(--text)' : '1px solid var(--line)', background: item.value, cursor: 'pointer', padding: 0 }} />)}
        </div>
      )}
      {status === 'error' && <div style={{ padding: '9px 11px', borderRadius: 9, background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.35)', fontSize: 12, fontWeight: 600 }}>{message}</div>}

      <div style={{ position: 'relative', width: '100%', margin: '0 auto', minHeight: 340, height: 'min(62vh, 620px)', overflow: 'hidden', borderRadius: 13, background: stageBackground, border: '1px solid var(--line)' }}>
        {!screenTrack && !sortedItems.length && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', opacity: .8, zIndex: 2, textAlign: 'center', padding: 20 }}>{status === 'connected' ? 'En attente des caméras…' : message}</div>}
        {screenTrack && <div ref={screenRef} style={{ position: 'absolute', inset: 0, zIndex: 1, background: '#000', padding: 4, overflow: 'hidden' }} />}
        {sortedItems.length > 0 && <div style={{ position: 'absolute', inset: 0, zIndex: 5, overflow: 'hidden' }}>
          {sortedItems.map((item, index) => <VideoTile
            key={`${item.id}-${item.track?.sid || ''}`}
            item={item}
            featured={featuredId === item.id}
            selected={selectedCameraId === item.id}
            moveMode={moveMode && selectedCameraId === item.id}
            size={cameraSize}
            position={cameraPositions[item.id] || { x: 2 + (index % 3) * 33, y: screenTrack ? 72 + Math.floor(index / 3) * 14 : 2 + Math.floor(index / 3) * 32 }}
            onSelect={() => setSelectedCameraId(item.id)}
            onMove={(x, y) => moveCamera(item.id, x, y)}
          />)}
        </div>}
      </div>

      {host && status === 'connected' && <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center', padding: '6px 4px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel)' }}>
        <button className="outline" onClick={() => void toggleCamera()} title={camera ? 'Couper la caméra' : 'Mettre la caméra'} aria-label={camera ? 'Couper la caméra' : 'Mettre la caméra'} style={controlButtonStyle}>{camera ? <CameraOff size={14} /> : <Camera size={14} />} {camera ? 'Couper la caméra' : 'Mettre la caméra'}</button>
        <button className="outline" onClick={() => void toggleMic()} title={mic ? 'Couper le micro' : 'Mettre le micro'} aria-label={mic ? 'Couper le micro' : 'Mettre le micro'} style={controlButtonStyle}>{mic ? <MicOff size={14} /> : <Mic size={14} />} {mic ? 'Couper le micro' : 'Mettre le micro'}</button>
        <button className="outline" onClick={toggleMoveMode} disabled={!activeCameraId} title={moveMode ? 'Terminer le déplacement' : 'Déplacer la caméra sélectionnée'} aria-label={moveMode ? 'Terminer le déplacement' : 'Déplacer la caméra sélectionnée'} style={{ ...controlButtonStyle, opacity: activeCameraId ? 1 : .5 }}><Move size={14} /> {moveMode ? 'Terminer le déplacement' : 'Déplacer'}</button>
        <button className="outline" onClick={toggleFeature} disabled={!activeCameraId} title={featuredId === activeCameraId ? 'Réduire la caméra mise en avant' : 'Mettre la caméra sélectionnée en avant'} aria-label={featuredId === activeCameraId ? 'Réduire la caméra mise en avant' : 'Mettre la caméra sélectionnée en avant'} style={{ ...controlButtonStyle, opacity: activeCameraId ? 1 : .5 }}><Maximize2 size={14} /> {featuredId === activeCameraId ? 'Réduire l’avant' : 'Mettre en avant'}</button>
        <button className="outline" onClick={toggleCameraSize} disabled={!activeCameraId || featuredId === activeCameraId} title={cameraSize === 'small' ? 'Passer la caméra en taille moyenne' : 'Revenir à la petite caméra'} aria-label={cameraSize === 'small' ? 'Agrandir la caméra' : 'Réduire la caméra'} style={{ ...controlButtonStyle, opacity: activeCameraId && featuredId !== activeCameraId ? 1 : .5 }}>{cameraSize === 'small' ? <Maximize2 size={14} /> : <Minimize2 size={14} />} {cameraSize === 'small' ? 'Agrandir' : 'Réduire'}</button>
        <button className="outline" onClick={() => void toggleScreen()} title={screenTrack ? "Arrêter le partage d'écran" : "Partager mon écran"} aria-label={screenTrack ? "Arrêter le partage d'écran" : "Partager mon écran"} style={controlButtonStyle}>{screenTrack ? <MonitorStop size={14} /> : <MonitorUp size={14} />} {screenTrack ? 'Arrêter le partage' : 'Partager mon écran'}</button>
        {onEndLive && <button type="button" onClick={onEndLive} disabled={endingLive} title="Couper le Live" aria-label="Couper le Live" style={{ ...controlButtonStyle, border: '1px solid rgba(239,68,68,.5)', background: 'rgba(127,29,29,.16)', color: '#f87171', fontWeight: 800, cursor: endingLive ? 'wait' : 'pointer', borderRadius: 8 }}><Square size={13} fill="currentColor" /> {endingLive ? 'Arrêt…' : 'Couper le Live'}</button>}
      </div>}

      {host && status === 'connected' && selectedItem && <div className="muted" style={{ textAlign: 'center', fontSize: 10 }}>Caméra sélectionnée : {selectedItem.label} · petite par défaut. « Agrandir » passe à une taille moyenne, « Mettre en avant » l’agrandit fortement, et « Déplacer » active le déplacement sur l’écran central.</div>}

      {!host && audioBlocked && status === 'connected' && <button className="outline" onClick={() => void roomRef.current?.startAudio().then(() => setAudioBlocked(false)).catch(() => {})} style={{ justifySelf: 'center', minHeight: 34, padding: '0 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Volume2 size={14} /> Activer le son</button>}
    </div>
  )
}
