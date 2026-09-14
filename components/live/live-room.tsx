'use client'

import { useEffect, useRef, useState } from 'react'
import { Room, RoomEvent, Track } from 'livekit-client'

type Props = { tokenUrl: string; tokenBody: Record<string, string>; host?: boolean }

type MediaStatus = 'idle' | 'ready' | 'denied' | 'error'

export default function LiveRoom({ tokenUrl, tokenBody, host = false }: Props) {
  const [state, setState] = useState<'loading' | 'connected' | 'error'>('loading')
  const [message, setMessage] = useState('Connexion au Live…')
  const [mediaMessage, setMediaMessage] = useState('')
  const [mic, setMic] = useState(false)
  const [camera, setCamera] = useState(false)
  const [micStatus, setMicStatus] = useState<MediaStatus>('idle')
  const [cameraStatus, setCameraStatus] = useState<MediaStatus>('idle')
  const localRef = useRef<HTMLDivElement>(null)
  const remoteRef = useRef<HTMLDivElement>(null)
  const roomRef = useRef<Room | null>(null)

  useEffect(() => {
    let cancelled = false
    const room = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = room

    const attach = (track: any, container: HTMLDivElement | null) => {
      if (!container || !track) return
      const element = track.attach()
      element.style.width = '100%'
      element.style.height = '100%'
      element.style.objectFit = 'cover'
      element.style.borderRadius = '12px'
      container.appendChild(element)
    }

    room.on(RoomEvent.TrackSubscribed, (track) => {
      attach(track, track.kind === Track.Kind.Video ? remoteRef.current : remoteRef.current)
    })
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove())
    })
    room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (publication.track && host) attach(publication.track, localRef.current)
    })

    const enableHostMedia = async () => {
      if (!host) return

      try {
        await room.localParticipant.setMicrophoneEnabled(true)
        if (!cancelled) {
          setMic(true)
          setMicStatus('ready')
        }
      } catch (error) {
        if (!cancelled) {
          setMic(false)
          setMicStatus('denied')
          setMediaMessage('Microphone refusé. Vous pouvez autoriser le microphone dans les permissions du navigateur puis réessayer.')
        }
      }

      try {
        await room.localParticipant.setCameraEnabled(true)
        if (!cancelled) {
          setCamera(true)
          setCameraStatus('ready')
        }
      } catch (error) {
        if (!cancelled) {
          setCamera(false)
          setCameraStatus('denied')
          setMediaMessage((current) => current || 'Caméra refusée. Vous pouvez autoriser la caméra dans les permissions du navigateur puis réessayer.')
        }
      }
    }

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

        setState('connected')
        setMessage(host ? 'Vous êtes connecté au studio.' : 'Vous êtes connecté au Live.')
        await enableHostMedia()
      } catch (error) {
        if (!cancelled) {
          setState('error')
          setMessage(error instanceof Error ? error.message : 'Connexion impossible.')
        }
      }
    })()

    return () => {
      cancelled = true
      room.disconnect()
    }
  }, [tokenUrl, JSON.stringify(tokenBody), host])

  async function toggleMic() {
    const room = roomRef.current
    if (!room) return
    const next = !mic
    try {
      await room.localParticipant.setMicrophoneEnabled(next)
      setMic(next)
      setMicStatus(next ? 'ready' : 'idle')
      if (next) setMediaMessage('')
    } catch {
      setMic(false)
      setMicStatus('denied')
      setMediaMessage('Microphone refusé. Vérifiez l’autorisation du microphone dans votre navigateur.')
    }
  }

  async function toggleCamera() {
    const room = roomRef.current
    if (!room) return
    const next = !camera
    try {
      await room.localParticipant.setCameraEnabled(next)
      setCamera(next)
      setCameraStatus(next ? 'ready' : 'idle')
      if (next) setMediaMessage('')
    } catch {
      setCamera(false)
      setCameraStatus('denied')
      setMediaMessage('Caméra refusée. Vérifiez l’autorisation de la caméra dans votre navigateur.')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ position: 'relative', minHeight: 480, borderRadius: 14, overflow: 'hidden', background: '#090a0f', border: '1px solid var(--line)' }}>
        <div ref={remoteRef} style={{ width: '100%', height: '100%', minHeight: 480, display: 'grid', placeItems: 'center' }}>
          {state !== 'connected' && <div style={{ color: '#fff', textAlign: 'center', padding: 24 }}><b>{message}</b></div>}
          {state === 'connected' && !host && <div style={{ color: '#fff', textAlign: 'center', padding: 24, opacity: 0.75 }}>En attente de la vidéo du créateur…</div>}
        </div>
        {host && <div ref={localRef} style={{ position: 'absolute', right: 16, bottom: 16, width: 220, height: 130, zIndex: 2, background: '#171922', borderRadius: 12, overflow: 'hidden' }} />}
      </div>

      {state === 'connected' && host && (
        <div style={{ display: 'grid', gap: 8 }}>
          {mediaMessage && <div className="error">{mediaMessage}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="outline" onClick={toggleMic}>{mic ? 'Couper le micro' : 'Activer le micro'}</button>
            <button className="outline" onClick={toggleCamera}>{camera ? 'Couper la caméra' : 'Activer la caméra'}</button>
          </div>
          {(micStatus === 'denied' || cameraStatus === 'denied') && (
            <div style={{ textAlign: 'center', fontSize: 13, opacity: 0.75 }}>
              Le studio reste accessible même si la caméra ou le microphone sont refusés.
            </div>
          )}
        </div>
      )}

      {state === 'error' && <div className="error">{message}</div>}
    </div>
  )
}
