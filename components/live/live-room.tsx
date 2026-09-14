'use client'

import { useEffect, useRef, useState } from 'react'
import { LocalVideoTrack, Room, RoomEvent, Track } from 'livekit-client'

type Props = { tokenUrl: string; tokenBody: Record<string, string>; host?: boolean }
type MediaStatus = 'idle' | 'ready' | 'denied' | 'error'

function mediaErrorMessage(error: unknown, device: 'camera' | 'microphone' | 'screen') {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return device === 'screen' ? 'Le partage d’écran a été refusé. Choisissez un écran, une fenêtre ou un onglet dans la fenêtre du navigateur.' : `Accès ${device === 'camera' ? 'à la caméra' : 'au microphone'} refusé. Autorisez ${device === 'camera' ? 'la caméra' : 'le microphone'} pour Conik dans les réglages du navigateur.`
  if (name === 'NotFoundError') return device === 'screen' ? 'Aucun écran ou fenêtre disponible.' : `Aucun ${device === 'camera' ? 'caméra' : 'microphone'} compatible n’a été trouvé.`
  if (name === 'NotReadableError' || name === 'TrackStartError') return `Le ${device === 'camera' ? 'caméra' : 'microphone'} est déjà utilisé par une autre application.`
  if (name === 'SecurityError') return 'Le navigateur bloque cette fonction. Ouvrez Conik avec HTTPS.'
  return device === 'screen' ? 'Impossible de démarrer le partage d’écran.' : `Impossible d’accéder à ${device === 'camera' ? 'la caméra' : 'au microphone'}.`
}

export default function LiveRoom({ tokenUrl, tokenBody, host = false }: Props) {
  const [state, setState] = useState<'loading' | 'connected' | 'error'>('loading')
  const [message, setMessage] = useState('Connexion au Live…')
  const [mediaMessage, setMediaMessage] = useState('')
  const [mic, setMic] = useState(false)
  const [camera, setCamera] = useState(false)
  const [screenShare, setScreenShare] = useState(false)
  const [micStatus, setMicStatus] = useState<MediaStatus>('idle')
  const [cameraStatus, setCameraStatus] = useState<MediaStatus>('idle')
  const [requestingPermissions, setRequestingPermissions] = useState(false)
  const localRef = useRef<HTMLDivElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const remoteRef = useRef<HTMLDivElement>(null)
  const roomRef = useRef<Room | null>(null)
  const screenTrackRef = useRef<LocalVideoTrack | null>(null)

  async function requestMediaPermissions() {
    if (!host) return true
    if (!window.isSecureContext) {
      setMediaMessage('La caméra et le microphone nécessitent une connexion HTTPS.')
      return false
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaMessage('Ce navigateur ne permet pas l’accès à la caméra et au microphone. Utilisez Chrome, Edge, Safari ou Firefox récent.')
      return false
    }
    setRequestingPermissions(true)
    setMediaMessage('')
    let audioGranted = false
    let videoGranted = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      audioGranted = stream.getAudioTracks().length > 0
      videoGranted = stream.getVideoTracks().length > 0
      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setMediaMessage('Autorisation caméra/micro refusée. Appuyez sur l’icône de réglages du site dans le navigateur et mettez Caméra et Microphone sur « Autoriser », puis réessayez.')
      }
      try {
        const audio = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioGranted = audio.getAudioTracks().length > 0
        audio.getTracks().forEach(track => track.stop())
      } catch (error) {
        setMicStatus('denied')
        setMediaMessage(current => current || mediaErrorMessage(error, 'microphone'))
      }
      try {
        const video = await navigator.mediaDevices.getUserMedia({ video: true })
        videoGranted = video.getVideoTracks().length > 0
        video.getTracks().forEach(track => track.stop())
      } catch (error) {
        setCameraStatus('denied')
        setMediaMessage(current => current || mediaErrorMessage(error, 'camera'))
      }
    } finally {
      setRequestingPermissions(false)
    }
    if (audioGranted) setMicStatus('ready')
    if (videoGranted) setCameraStatus('ready')
    return audioGranted || videoGranted
  }

  useEffect(() => {
    let cancelled = false
    const room = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = room
    const attach = (track: any, container: HTMLDivElement | null) => {
      if (!container || !track || track.kind !== Track.Kind.Video) return
      const element = track.attach()
      element.style.width = '100%'
      element.style.height = '100%'
      element.style.objectFit = 'contain'
      element.style.borderRadius = '12px'
      container.appendChild(element)
    }
    const getContainer = (source: Track.Source, local = false) => source === Track.Source.ScreenShare ? screenRef.current : local ? localRef.current : remoteRef.current
    room.on(RoomEvent.TrackSubscribed, (track, publication) => attach(track, getContainer(publication.source)))
    room.on(RoomEvent.TrackUnsubscribed, track => track.detach().forEach(el => el.remove()))
    room.on(RoomEvent.LocalTrackPublished, publication => {
      if (publication.track && host) attach(publication.track, getContainer(publication.source, true))
    })
    room.on(RoomEvent.LocalTrackUnpublished, publication => {
      if (publication.track) publication.track.detach().forEach(el => el.remove())
    })

    ;(async () => {
      try {
        const response = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tokenBody) })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Impossible de préparer la connexion.')
        await room.connect(data.url, data.token)
        if (cancelled) return
        setState('connected')
        setMessage(host ? 'Vous êtes connecté au studio.' : 'Vous êtes connecté au Live.')

        if (host) {
          // Try both devices after LiveKit is connected. If the browser has already granted access,
          // the creator goes live immediately; otherwise the controls below remain available.
          try {
            await room.localParticipant.setMicrophoneEnabled(true)
            if (!cancelled) { setMic(true); setMicStatus('ready') }
          } catch (error) {
            if (!cancelled) { setMic(false); setMicStatus('denied'); setMediaMessage(mediaErrorMessage(error, 'microphone')) }
          }
          try {
            await room.localParticipant.setCameraEnabled(true)
            if (!cancelled) { setCamera(true); setCameraStatus('ready') }
          } catch (error) {
            if (!cancelled) { setCamera(false); setCameraStatus('denied'); setMediaMessage(current => current || mediaErrorMessage(error, 'camera')) }
          }
        }
      } catch (error) {
        if (!cancelled) { setState('error'); setMessage(error instanceof Error ? error.message : 'Connexion impossible.') }
      }
    })()

    return () => {
      cancelled = true
      screenTrackRef.current?.stop()
      screenTrackRef.current = null
      room.disconnect()
    }
  }, [tokenUrl, JSON.stringify(tokenBody), host])

  async function toggleMic() {
    const room = roomRef.current
    if (!room || !host) return
    const next = !mic
    try {
      if (next) {
        const permitted = await requestMediaPermissions()
        if (!permitted) return
      }
      await room.localParticipant.setMicrophoneEnabled(next)
      setMic(next)
      setMicStatus(next ? 'ready' : 'idle')
      if (next) setMediaMessage('')
    } catch (error) {
      setMic(false)
      setMicStatus('denied')
      setMediaMessage(mediaErrorMessage(error, 'microphone'))
    }
  }

  async function toggleCamera() {
    const room = roomRef.current
    if (!room || !host) return
    const next = !camera
    try {
      if (next) {
        const permitted = await requestMediaPermissions()
        if (!permitted) return
      }
      await room.localParticipant.setCameraEnabled(next)
      setCamera(next)
      setCameraStatus(next ? 'ready' : 'idle')
      if (next) setMediaMessage('')
    } catch (error) {
      setCamera(false)
      setCameraStatus('denied')
      setMediaMessage(mediaErrorMessage(error, 'camera'))
    }
  }

  async function toggleScreenShare() {
    const room = roomRef.current
    if (!room || !host) return
    if (screenShare) {
      try {
        await room.localParticipant.setScreenShareEnabled(false)
        screenTrackRef.current?.stop()
        screenTrackRef.current = null
        setScreenShare(false)
        setMediaMessage('')
      } catch (error) {
        setMediaMessage(mediaErrorMessage(error, 'screen'))
      }
      return
    }
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getDisplayMedia) throw new Error('DISPLAY_CAPTURE_UNSUPPORTED')
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false })
      const mediaStreamTrack = stream.getVideoTracks()[0]
      if (!mediaStreamTrack) throw new Error('DISPLAY_CAPTURE_UNAVAILABLE')
      const localTrack = new LocalVideoTrack(mediaStreamTrack, true)
      await room.localParticipant.publishTrack(localTrack, { source: Track.Source.ScreenShare, name: 'Conik screen share' })
      screenTrackRef.current = localTrack
      mediaStreamTrack.addEventListener('ended', () => {
        void room.localParticipant.unpublishTrack(mediaStreamTrack, true)
        localTrack.stop()
        screenTrackRef.current = null
        setScreenShare(false)
      })
      setScreenShare(true)
      setMediaMessage('')
    } catch (error) {
      setScreenShare(false)
      setMediaMessage(error instanceof Error && error.message.startsWith('DISPLAY_CAPTURE') ? 'Le partage d’écran n’est pas disponible dans ce navigateur. Utilisez un navigateur compatible et HTTPS.' : mediaErrorMessage(error, 'screen'))
    }
  }

  return <div style={{ display: 'grid', gap: 12 }}>
    <div style={{ position: 'relative', minHeight: 480, borderRadius: 14, overflow: 'hidden', background: '#090a0f', border: '1px solid var(--line)' }}>
      <div ref={remoteRef} style={{ width: '100%', height: '100%', minHeight: 480, display: 'grid', placeItems: 'center' }}>
        {state !== 'connected' && <div style={{ color: '#fff', textAlign: 'center', padding: 24 }}><b>{message}</b></div>}
        {state === 'connected' && !host && <div style={{ color: '#fff', textAlign: 'center', padding: 24, opacity: 0.75 }}>En attente de la vidéo du créateur…</div>}
      </div>
      {host && <div ref={localRef} style={{ position: 'absolute', right: 16, bottom: 16, width: 220, height: 130, zIndex: 2, background: '#171922', borderRadius: 12, overflow: 'hidden' }} />}
      {host && <div ref={screenRef} style={{ position: 'absolute', left: 16, top: 16, right: 16, bottom: 16, zIndex: 1, pointerEvents: 'none' }} />}
    </div>
    {state === 'connected' && host && <div style={{ display: 'grid', gap: 8 }}>
      {mediaMessage && <div className="error">{mediaMessage}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="outline" onClick={toggleMic}>{mic ? 'Couper le micro' : 'Activer le micro'}</button>
        <button className="outline" onClick={toggleCamera}>{camera ? 'Couper la caméra' : 'Activer la caméra'}</button>
        <button className="outline" onClick={toggleScreenShare}>{screenShare ? 'Arrêter le partage' : 'Partager mon écran'}</button>
        <button className="outline" onClick={() => void requestMediaPermissions()} disabled={requestingPermissions}>{requestingPermissions ? 'Demande en cours…' : 'Autoriser caméra + micro'}</button>
      </div>
      {(micStatus === 'denied' || cameraStatus === 'denied') && <div style={{ textAlign: 'center', fontSize: 13, opacity: 0.75 }}>Si vous avez déjà refusé l’accès, ouvrez les autorisations du site dans le navigateur, mettez Caméra et Microphone sur « Autoriser », puis appuyez sur « Autoriser caméra + micro ».</div>}
    </div>}
    {state === 'error' && <div className="error">{message}</div>}
  </div>
}
