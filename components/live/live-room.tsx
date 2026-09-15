'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Mic, MicOff, MonitorUp, MonitorStop, Volume2 } from 'lucide-react'
import { Room, RoomEvent, Track } from 'livekit-client'

type Props = { tokenUrl: string; tokenBody: Record<string, string>; host?: boolean }
type MediaStatus = 'idle' | 'ready' | 'denied' | 'error'

function isEmbeddedBrowser() {
  const ua = navigator.userAgent || ''
  return /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|wv\)|; wv\)|WhatsApp/i.test(ua) || (/(Android)/i.test(ua) && /; wv\)/i.test(ua))
}

function mediaErrorMessage(error: unknown, device: 'camera' | 'microphone' | 'screen') {
  const name = error instanceof DOMException ? error.name : ''
  if (device === 'screen') {
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'Le partage d’écran a été refusé ou annulé. Autorisez le partage lorsque le navigateur affiche sa fenêtre de sélection, puis réessayez.'
    if (name === 'AbortError') return 'La fenêtre de partage d’écran a été fermée. Appuyez de nouveau sur « Partager mon écran » et sélectionnez un écran, une fenêtre ou un onglet.'
    if (name === 'InvalidStateError') return 'Le partage d’écran doit être lancé directement depuis le bouton du Live. Réessayez depuis « Partager mon écran ».'
    if (name === 'NotSupportedError' || name === 'TypeError') return 'Ce navigateur ne permet pas le partage d’écran dans cette page. Ouvrez le Live directement dans Chrome, Edge ou Firefox, de préférence sur ordinateur.'
    if (name === 'SecurityError') return 'Le navigateur bloque le partage d’écran. Vérifiez que vous utilisez l’adresse HTTPS de Conik directement, et non une page intégrée dans une autre application.'
    return 'Le partage d’écran n’a pas pu démarrer. Vérifiez le navigateur et les autorisations, puis réessayez.'
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return `Accès ${device === 'camera' ? 'à la caméra' : 'au microphone'} refusé. Autorisez ${device === 'camera' ? 'la caméra' : 'le microphone'} pour Conik dans les réglages du navigateur.`
  if (name === 'NotFoundError') return `Aucun ${device === 'camera' ? 'caméra' : 'microphone'} compatible n’a été trouvé.`
  if (name === 'NotReadableError' || name === 'TrackStartError') return `Le ${device === 'camera' ? 'caméra' : 'microphone'} est déjà utilisé par une autre application.`
  if (name === 'SecurityError') return 'Le navigateur bloque l’accès aux appareils. Ouvrez Conik directement avec HTTPS.'
  return `Impossible d’accéder à ${device === 'camera' ? 'la caméra' : 'au microphone'}.`
}

function screenShareSupportMessage() {
  if (!window.isSecureContext) return 'Partage d’écran indisponible : cette page n’est pas en HTTPS. Ouvrez le lien Conik HTTPS directement.'
  if (window.top !== window.self) return 'Partage d’écran indisponible : le Live est ouvert dans une page intégrée. Ouvrez le Live directement dans votre navigateur.'
  if (isEmbeddedBrowser()) return 'Partage d’écran indisponible dans ce navigateur intégré. Ouvrez le lien du Live directement dans Chrome, Edge ou Firefox.'
  if (!navigator.mediaDevices?.getDisplayMedia) return 'Partage d’écran indisponible sur ce navigateur. Utilisez une version récente de Chrome, Edge ou Firefox.'
  return ''
}

export default function LiveRoom({ tokenUrl, tokenBody, host = false }: Props) {
  const [state, setState] = useState<'loading' | 'connected' | 'error'>('loading')
  const [message, setMessage] = useState('Connexion au Live…')
  const [mediaMessage, setMediaMessage] = useState('')
  const [mic, setMic] = useState(false)
  const [camera, setCamera] = useState(false)
  const [screenShare, setScreenShare] = useState(false)
  const [screenShareChanging, setScreenShareChanging] = useState(false)
  const [screenShareAvailable, setScreenShareAvailable] = useState(true)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [micStatus, setMicStatus] = useState<MediaStatus>('idle')
  const [cameraStatus, setCameraStatus] = useState<MediaStatus>('idle')
  const [requestingPermissions, setRequestingPermissions] = useState(false)
  const localRef = useRef<HTMLDivElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const remoteRef = useRef<HTMLDivElement>(null)
  const roomRef = useRef<Room | null>(null)

  useEffect(() => {
    if (!host) return
    const supportError = screenShareSupportMessage()
    setScreenShareAvailable(!supportError)
    if (supportError) setMediaMessage(supportError)
  }, [host])

  async function requestMediaPermissions() {
    if (!host) return true
    if (!window.isSecureContext) { setMediaMessage('La caméra et le microphone nécessitent une connexion HTTPS.'); return false }
    if (!navigator.mediaDevices?.getUserMedia) { setMediaMessage('Ce navigateur ne permet pas l’accès à la caméra et au microphone. Utilisez un navigateur récent.'); return false }
    setRequestingPermissions(true); setMediaMessage('')
    let audioGranted = false, videoGranted = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      audioGranted = stream.getAudioTracks().length > 0; videoGranted = stream.getVideoTracks().length > 0
      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') setMediaMessage('Autorisation caméra/micro refusée. Autorisez Caméra et Microphone pour Conik dans les réglages du navigateur, puis réessayez.')
      try { const audio = await navigator.mediaDevices.getUserMedia({ audio: true }); audioGranted = audio.getAudioTracks().length > 0; audio.getTracks().forEach(track => track.stop()) } catch (error) { setMicStatus('denied'); setMediaMessage(current => current || mediaErrorMessage(error, 'microphone')) }
      try { const video = await navigator.mediaDevices.getUserMedia({ video: true }); videoGranted = video.getVideoTracks().length > 0; video.getTracks().forEach(track => track.stop()) } catch (error) { setCameraStatus('denied'); setMediaMessage(current => current || mediaErrorMessage(error, 'camera')) }
    } finally { setRequestingPermissions(false) }
    if (audioGranted) setMicStatus('ready'); if (videoGranted) setCameraStatus('ready')
    return audioGranted || videoGranted
  }

  useEffect(() => {
    let cancelled = false
    const room = new Room({ adaptiveStream: true, dynacast: true })
    roomRef.current = room
    const attachVideo = (track: any, container: HTMLDivElement | null) => {
      if (!container || !track || track.kind !== Track.Kind.Video) return
      const element = track.attach(); element.style.width = '100%'; element.style.height = '100%'; element.style.objectFit = 'contain'; element.style.borderRadius = '12px'; container.appendChild(element)
    }
    const attachAudio = (track: any) => {
      if (!track || track.kind !== Track.Kind.Audio) return
      const element = track.attach(); element.autoplay = true; element.muted = false; element.volume = 1; element.setAttribute('playsinline', 'true'); element.style.display = 'none'; document.body.appendChild(element); void element.play().catch(() => { if (!cancelled) setAudioBlocked(true) })
    }
    const getContainer = (source: Track.Source, local = false) => source === Track.Source.ScreenShare ? screenRef.current : local ? localRef.current : remoteRef.current
    room.on(RoomEvent.TrackSubscribed, (track, publication) => { if (track.kind === Track.Kind.Audio) attachAudio(track); else attachVideo(track, getContainer(publication.source)) })
    room.on(RoomEvent.TrackUnsubscribed, track => track.detach().forEach(el => el.remove()))
    room.on(RoomEvent.LocalTrackPublished, publication => { if (publication.track && host) { if (publication.track.kind === Track.Kind.Audio) return; attachVideo(publication.track, getContainer(publication.source, true)) } })
    room.on(RoomEvent.LocalTrackUnpublished, publication => { if (publication.track) publication.track.detach().forEach(el => el.remove()) })
    ;(async () => {
      try {
        const response = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tokenBody) })
        const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Impossible de préparer la connexion.')
        await room.connect(data.url, data.token); if (cancelled) return
        setState('connected'); setMessage(host ? 'Vous êtes connecté au studio.' : 'Vous êtes connecté au Live.')
        if (!host) { try { await room.startAudio(); setAudioBlocked(false) } catch { setAudioBlocked(true) } }
        if (host) {
          try { await room.localParticipant.setMicrophoneEnabled(true); if (!cancelled) { setMic(true); setMicStatus('ready') } } catch (error) { if (!cancelled) { setMic(false); setMicStatus('denied'); setMediaMessage(mediaErrorMessage(error, 'microphone')) } }
          try { await room.localParticipant.setCameraEnabled(true); if (!cancelled) { setCamera(true); setCameraStatus('ready') } } catch (error) { if (!cancelled) { setCamera(false); setCameraStatus('denied'); setMediaMessage(current => current || mediaErrorMessage(error, 'camera')) } }
        }
      } catch (error) { if (!cancelled) { setState('error'); setMessage(error instanceof Error ? error.message : 'Connexion impossible.') } }
    })()
    return () => { cancelled = true; room.disconnect() }
  }, [tokenUrl, JSON.stringify(tokenBody), host])

  async function enableAudio() { const room = roomRef.current; if (!room || host) return; try { await room.startAudio(); setAudioBlocked(false) } catch { setAudioBlocked(true) } }
  async function toggleMic() {
    const room = roomRef.current; if (!room || !host) return; const next = !mic
    try { if (next && !(await requestMediaPermissions())) return; await room.localParticipant.setMicrophoneEnabled(next); setMic(next); setMicStatus(next ? 'ready' : 'idle'); if (next) setMediaMessage('') } catch (error) { setMic(false); setMicStatus('denied'); setMediaMessage(mediaErrorMessage(error, 'microphone')) }
  }
  async function toggleCamera() {
    const room = roomRef.current; if (!room || !host) return; const next = !camera
    try { if (next && !(await requestMediaPermissions())) return; await room.localParticipant.setCameraEnabled(next); setCamera(next); setCameraStatus(next ? 'ready' : 'idle'); if (next) setMediaMessage('') } catch (error) { setCamera(false); setCameraStatus('denied'); setMediaMessage(mediaErrorMessage(error, 'camera')) }
  }
  async function startOrChangeScreenShare() {
    const room = roomRef.current; if (!room || !host || screenShareChanging) return
    const supportError = screenShareSupportMessage(); if (supportError) { setScreenShareAvailable(false); setMediaMessage(supportError); return }
    setScreenShareChanging(true); setMediaMessage('Sélectionnez maintenant l’écran, la fenêtre ou l’onglet à partager.')
    try { if (screenShare) { await room.localParticipant.setScreenShareEnabled(false); setScreenShare(false) }; await room.localParticipant.setScreenShareEnabled(true, { audio: false, video: true, selfBrowserSurface: 'exclude', surfaceSwitching: 'include' }); setScreenShare(true); setScreenShareAvailable(true); setMediaMessage('') } catch (error) { setScreenShare(false); setMediaMessage(mediaErrorMessage(error, 'screen')) } finally { setScreenShareChanging(false) }
  }
  async function stopScreenShare() { const room = roomRef.current; if (!room || !host || screenShareChanging) return; setScreenShareChanging(true); try { await room.localParticipant.setScreenShareEnabled(false); setScreenShare(false); setMediaMessage('') } catch (error) { setMediaMessage(mediaErrorMessage(error, 'screen')) } finally { setScreenShareChanging(false) } }

  const controlStyle: React.CSSProperties = { minHeight: 46, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 700 }
  const stageHeight = 'clamp(500px, 68vh, 720px)'

  return <div style={{ display: 'grid', gap: 12 }}>
    <div data-conik-studio-stage="true" style={{ position: 'relative', minHeight: stageHeight, borderRadius: 14, overflow: 'hidden', background: '#090a0f', border: '1px solid var(--line)' }}>
      <div ref={remoteRef} style={{ width: '100%', height: '100%', minHeight: stageHeight, display: 'grid', placeItems: 'center' }}>
        {state !== 'connected' && <div style={{ color: '#fff', textAlign: 'center', padding: 24 }}><b>{message}</b></div>}
        {state === 'connected' && !host && <div style={{ color: '#fff', textAlign: 'center', padding: 24, opacity: 0.75 }}>En attente de la vidéo du créateur…</div>}
      </div>
      <div ref={screenRef} style={{ position: 'absolute', left: 16, top: 16, right: 16, bottom: 16, zIndex: 1, pointerEvents: 'none' }} />
      <div ref={localRef} style={{ position: 'absolute', right: 16, bottom: 16, width: host ? 220 : 200, height: host ? 130 : 120, zIndex: 2, background: '#171922', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.18)' }} />
      {host && screenShare && state === 'connected' && <div style={{ position: 'absolute', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 5, display: 'flex', alignItems: 'center', gap: 8, padding: 8, borderRadius: 14, background: 'rgba(15,17,24,.94)', border: '1px solid rgba(255,255,255,.16)', boxShadow: '0 12px 36px rgba(0,0,0,.35)', backdropFilter: 'blur(12px)', maxWidth: 'calc(100% - 24px)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, padding: '6px 8px', whiteSpace: 'nowrap' }}><MonitorUp size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Écran partagé</span>
        <button className="outline" onClick={() => void startOrChangeScreenShare()} disabled={screenShareChanging} style={{ ...controlStyle, minHeight: 38, whiteSpace: 'nowrap' }}><MonitorUp size={15} />{screenShareChanging ? 'Ouverture…' : 'Changer de source'}</button>
        <button className="outline" onClick={() => void stopScreenShare()} disabled={screenShareChanging} style={{ ...controlStyle, minHeight: 38, whiteSpace: 'nowrap' }}><MonitorStop size={15} />Arrêter</button>
      </div>
      {!host && audioBlocked && state === 'connected' && <button onClick={() => void enableAudio()} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 4, padding: '12px 18px', borderRadius: 10, border: 0, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}><Volume2 size={17} />Activer le son</button>}
    </div>

    {state === 'connected' && host && <div style={{ display: 'grid', gap: 8 }}>
      {mediaMessage && <div className="error">{mediaMessage}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="outline" onClick={toggleMic} disabled={requestingPermissions} style={{ ...controlStyle, borderColor: mic ? 'rgba(255,255,255,.16)' : 'rgba(239,68,68,.5)', color: mic ? 'inherit' : '#f87171' }} title={mic ? 'Couper le microphone' : 'Activer le microphone'}>{mic ? <Mic size={18} /> : <MicOff size={18} />}{mic ? 'Couper le micro' : 'Activer le micro'}</button>
        <button className="outline" onClick={toggleCamera} disabled={requestingPermissions} style={{ ...controlStyle, borderColor: camera ? 'rgba(255,255,255,.16)' : 'rgba(239,68,68,.5)', color: camera ? 'inherit' : '#f87171' }} title={camera ? 'Couper la caméra' : 'Activer la caméra'}>{camera ? <Camera size={18} /> : <CameraOff size={18} />}{camera ? 'Couper la caméra' : 'Activer la caméra'}</button>
        <button className="outline" onClick={() => void (screenShare ? stopScreenShare() : startOrChangeScreenShare())} disabled={!screenShareAvailable || screenShareChanging} style={{ ...controlStyle, borderColor: screenShare ? 'rgba(59,130,246,.55)' : 'rgba(255,255,255,.12)' }} title={screenShare ? 'Arrêter le partage d’écran' : 'Partager mon écran'}>{screenShare ? <MonitorStop size={18} /> : <MonitorUp size={18} />}{screenShare ? 'Arrêter le partage' : screenShareChanging ? 'Ouverture…' : 'Partager mon écran'}</button>
      </div>
      {requestingPermissions && <div className="muted" style={{ textAlign: 'center', fontSize: 12 }}>Vérification des autorisations caméra et microphone…</div>}
    </div>}
  </div>
}
