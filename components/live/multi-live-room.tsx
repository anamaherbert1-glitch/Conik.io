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
    ? (size === 'large' ? 'clamp(320px,72%,920px)' : size === 'medium' ? 'clamp(280px,58%,720px)' : 'clamp(240px,48%,560px)')
    : size === 'large'
      ? 'clamp(240px,48%,560px)'
      : size === 'medium'
        ? 'clamp(180px,34%,400px)'
        : 'clamp(120px,26%,280px)'

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
  const cameraPositionsRef = useRef<Record<string, Position>>({})
  const roomRef = useRef<Room | null>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const background = BACKGROUNDS[backgroundId] || BACKGROUNDS.blue

  // RESTORED_STUB - full file continues via second push if needed
  return <div>Live room loading…</div>
}
