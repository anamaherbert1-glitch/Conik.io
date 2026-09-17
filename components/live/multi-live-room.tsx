'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  MonitorUp,
  MonitorStop,
  Square,
  Volume2,
} from 'lucide-react'
import { Room, RoomEvent, Track } from 'livekit-client'

type Props = {
  tokenUrl: string
  tokenBody: Record<string, string>
  host?: boolean
  label?: string
  onEndLive?: () => void
  endingLive?: boolean
}

type VideoItem = {
  id: string
  label: string
  track: any
  local: boolean
}

const BACKGROUNDS: Record<string, { label: string; value: string }> = {
  white: { label: 'Blanc', value: 'linear-gradient(135deg,#ffffff 0%,#f1f5f9 55%,#e2e8f0 100%)' },
  blue: { label: 'Bleu', value: 'linear-gradient(135deg,#071a3d 0%,#0b5cff 55%,#48b8ff 100%)' },
  violet: { label: 'Violet', value: 'linear-gradient(135deg,#160a35 0%,#6d28d9 55%,#b56cff 100%)' },
  cyan: { label: 'Cyan', value: 'linear-gradient(135deg,#062a35 0%,#087f9b 55%,#54e0ff 100%)' },
  dark: { label: 'Sombre', value: 'linear-gradient(135deg,#05060a 0%,#111827 55%,#273449 100%)' },
}

export default function MultiLiveRoom({
  tokenUrl,
  tokenBody,
  host = false,
  label,
  onEndLive,
  endingLive = false,
}: Props) {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [message, setMessage] = useState('Connexion au Live…')
  const [items, setItems] = useState<VideoItem[]>([])
  const [mic, setMic] = useState(false)
  const [camera, setCamera] = useState(false)
  const [screenTrack, setScreenTrack] = useState<any>(null)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [backgroundId, setBackgroundId] = useState('blue')
  const roomRef = useRef<Room | null>(null)
  const screenRef = useRef<HTMLDivElement>(null)

  const background = BACKGROUNDS[backgroundId] || BACKGROUNDS.blue

  useEffect(() => {
    let cancelled = false
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    })
    roomRef.current = room

    const upsert = (item: VideoItem) => {
      setItems((current) => {
        const existing = current.find((x) => x.id === item.id)
        if (existing?.track === item.track && existing.label === item.label) return current
        return [...current.filter((x) => x.id !== item.id), item]
      })
    }

    const remove = (id: string) => {
      setItems((current) => current.filter((x) => x.id !== id))
    }

    const participantLabel = (participant: any) => {
      if (participant.name) return participant.name
      if (String(participant.identity).startsWith('cohost-')) return 'Co-organisateur'
      return 'Organisateur principal'
    }

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

    const handleSubscribed = (track: any, publication: any, participant: any) => {
      if (track.kind === Track.Kind.Audio) {
        attachAudio(track)
        return
      }
      if (publication.source === Track.Source.ScreenShare) {
        setScreenTrack(track)
        return
      }
      if (publication.source !== Track.Source.Camera) return
      upsert({
        id: participant.identity,
        label: participantLabel(participant),
        track,
        local: false,
      })
    }

    room.on(RoomEvent.TrackSubscribed, handleSubscribed)

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      track.detach().forEach((el) => el.remove())
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(null)
      if (publication.source === Track.Source.Camera) remove(participant.identity)
    })

    room.on(RoomEvent.TrackPublished, (publication, participant) => {
      if (publication.source !== Track.Source.Camera) return
      if (publication.isSubscribed && publication.track) {
        upsert({
          id: participant.identity,
          label: participantLabel(participant),
          track: publication.track,
          local: false,
        })
      }
    })

    room.on(RoomEvent.TrackUnpublished, (publication, participant) => {
      if (publication.source === Track.Source.Camera) remove(participant.identity)
      if (publication.source === Track.Source.ScreenShare) setScreenTrack(null)
    })

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      remove(participant.identity)
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
        if (!data.url || !data.token) throw new Error('Réponse LiveKit invalide (url/token manquants).')

        await room.connect(data.url, data.token)
        if (cancelled) return
        setStatus('connected')
        setMessage(host ? 'Vous êtes connecté au studio.' : 'Vous êtes connecté au Live.')

        if (host) {
          try {
            await room.localParticipant.setMicrophoneEnabled(true)
            if (!cancelled) setMic(true)
          } catch {
            if (!cancelled) setMessage('Microphone non disponible.')
          }
          try {
            await room.localParticipant.setCameraEnabled(true)
            if (!cancelled) setCamera(true)
          } catch (err) {
            if (!cancelled) {
              const name = err instanceof Error ? err.name : ''
              const msg = err instanceof Error ? err.message : ''
              if (name === 'NotAllowedError' || /Permission|NotAllowed/i.test(msg)) {
                setMessage('Autorisez la caméra dans le navigateur, puis activez la caméra.')
              } else if (name === 'NotFoundError' || /NotFound|device/i.test(msg)) {
                setMessage('Aucune caméra détectée sur cet appareil.')
              } else {
                setMessage(msg || 'Caméra non disponible.')
              }
            }
          }
        } else {
          try {
            await room.startAudio()
            setAudioBlocked(false)
          } catch {
            setAudioBlocked(true)
          }
        }

        // Récupère aussi les publications déjà présentes au moment de la connexion.
        room.remoteParticipants.forEach((participant: any) => {
          participant.trackPublications.forEach((publication: any) => {
            if (publication.source === Track.Source.Camera && publication.isSubscribed && publication.track) {
              upsert({
                id: participant.identity,
                label: participantLabel(participant),
                track: publication.track,
                local: false,
              })
            }
          })
        })
      } catch (error) {
        if (!cancelled) {
          setStatus('error')
          setMessage(error instanceof Error ? error.message : 'Connexion impossible.')
        }
      }
    })()

    return () => {
      cancelled = true
      room.disconnect()
      roomRef.current = null
    }
  }, [tokenUrl, JSON.stringify(tokenBody), host, label])

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
    return () => screenTrack.detach().forEach((node: any) => node.remove())
  }, [screenTrack])

  const sortedItems = useMemo(() => {
    const local = items.filter((item) => item.local)
    const remote = items.filter((item) => !item.local)
    return [...local, ...remote]
  }, [items])

  const attachVideo = (el: HTMLDivElement | null, item: VideoItem) => {
    if (!el || !item.track) return
    el.querySelectorAll('video').forEach((v) => v.remove())
    try {
      const video = item.track.attach() as HTMLVideoElement
      video.autoplay = true
      video.playsInline = true
      video.muted = item.local || host
      video.style.width = '100%'
      video.style.height = '100%'
      video.style.objectFit = 'cover'
      video.style.display = 'block'
      el.appendChild(video)
      void video.play().catch(() => {})
    } catch {}
  }

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
      if (next) setMessage('Caméra activée.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Impossible d'activer la caméra.")
    }
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
        throw new Error("Le partage d'écran nécessite HTTPS et un navigateur compatible.")
      }
      await room.localParticipant.setScreenShareEnabled(true, {
        audio: false,
        video: true,
        selfBrowserSurface: 'exclude',
        surfaceSwitching: 'include',
      })
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de partager l'écran.")
    }
  }

  const stageBackground = screenTrack ? '#000' : background.value

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {host && status === 'connected' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 12, border: '1px solid var(--line)', background: 'var(--panel)' }}>
          <span className="muted" style={{ fontSize: 12, fontWeight: 800 }}>Arrière-plan</span>
          {Object.entries(BACKGROUNDS).map(([id, item]) => (
            <button key={id} type="button" title={item.label} aria-label={item.label} onClick={() => setBackgroundId(id)} style={{ width: 28, height: 28, borderRadius: 8, border: backgroundId === id ? '2px solid var(--text)' : '1px solid var(--line)', background: item.value, cursor: 'pointer', padding: 0 }} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.35)', fontSize: 13, fontWeight: 600 }}>
          {message}
        </div>
      )}

      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: 14, background: stageBackground, border: '1px solid var(--line)' }}>
        {!screenTrack && sortedItems.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff', opacity: 0.8, zIndex: 2, textAlign: 'center', padding: 20 }}>
            {status === 'connected' ? 'En attente des caméras…' : message}
          </div>
        )}

        {screenTrack && <div ref={screenRef} style={{ position: 'absolute', inset: 0, zIndex: 1, background: '#000', padding: 4, overflow: 'hidden' }} />}

        {sortedItems.length > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: screenTrack ? 'auto 8px 8px 8px' : 8,
              bottom: screenTrack ? 8 : 8,
              zIndex: 5,
              display: 'grid',
              gridTemplateColumns: sortedItems.length === 1 ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))',
              gridAutoRows: sortedItems.length <= 2 ? 'minmax(0,1fr)' : 'minmax(0,1fr)',
              gap: 8,
              height: screenTrack ? 'clamp(96px,22%,180px)' : 'calc(100% - 16px)',
            }}
          >
            {sortedItems.slice(0, 4).map((item) => (
              <div key={item.id} ref={(el) => attachVideo(el, item)} style={{ position: 'relative', minWidth: 0, minHeight: 0, overflow: 'hidden', borderRadius: 12, background: '#171922', border: item.local ? '2px solid rgba(255,255,255,.9)' : '1px solid rgba(255,255,255,.35)', boxShadow: '0 8px 24px rgba(0,0,0,.28)' }}>
                <div style={{ position: 'absolute', left: 8, bottom: 8, zIndex: 3, padding: '5px 8px', borderRadius: 7, background: 'rgba(0,0,0,.68)', color: '#fff', fontSize: 11, fontWeight: 800 }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {host && status === 'connected' && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="outline" onClick={() => void toggleMic()} style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {mic ? <Mic size={17} /> : <MicOff size={17} />} {mic ? 'Couper le micro' : 'Activer le micro'}
          </button>
          <button className="outline" onClick={() => void toggleCamera()} style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {camera ? <Camera size={17} /> : <CameraOff size={17} />} {camera ? 'Couper la caméra' : 'Activer la caméra'}
          </button>
          <button className="outline" onClick={() => void toggleScreen()} style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            {screenTrack ? <MonitorStop size={17} /> : <MonitorUp size={17} />} {screenTrack ? 'Arrêter le partage' : 'Partager mon écran'}
          </button>
          {onEndLive && (
            <button type="button" onClick={onEndLive} disabled={endingLive} style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid rgba(239,68,68,.5)', background: 'rgba(127,29,29,.16)', color: '#f87171', fontWeight: 800, cursor: endingLive ? 'wait' : 'pointer', borderRadius: 8, padding: '0 12px' }}>
              <Square size={16} fill="currentColor" /> {endingLive ? 'Arrêt…' : 'Couper le Live'}
            </button>
          )}
        </div>
      )}

      {!host && audioBlocked && status === 'connected' && (
        <button onClick={() => void roomRef.current?.startAudio().then(() => setAudioBlocked(false)).catch(() => {})} style={{ minHeight: 44, border: 0, borderRadius: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Volume2 size={17} /> Activer le son
        </button>
      )}
    </div>
  )
}
