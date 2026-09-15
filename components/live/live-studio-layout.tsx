'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { Camera, LayoutDashboard, MonitorUp, Move, Palette, GripVertical } from 'lucide-react'

type Background = { id: string; label: string; value: string }

const BACKGROUNDS: Background[] = [
  { id: 'white', label: 'Blanc', value: 'linear-gradient(135deg,#ffffff 0%,#f1f5f9 55%,#e2e8f0 100%)' },
  { id: 'blue', label: 'Bleu', value: 'linear-gradient(135deg,#071a3d 0%,#0b5cff 55%,#48b8ff 100%)' },
  { id: 'violet', label: 'Violet', value: 'linear-gradient(135deg,#160a35 0%,#6d28d9 55%,#b56cff 100%)' },
  { id: 'cyan', label: 'Cyan', value: 'linear-gradient(135deg,#062a35 0%,#087f9b 55%,#54e0ff 100%)' },
  { id: 'dark', label: 'Sombre', value: 'linear-gradient(135deg,#05060a 0%,#111827 55%,#273449 100%)' },
]

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--line)',
  background: 'var(--panel)',
  borderRadius: 14,
  padding: 12,
}

export default function LiveStudioLayout({ children, host = false }: { children: ReactNode; host?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [primary, setPrimary] = useState<'camera' | 'screen'>('camera')
  const [background, setBackground] = useState(BACKGROUNDS[1].id)
  const [hasScreen, setHasScreen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [cameraPosition, setCameraPosition] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!host) return
    const root = rootRef.current
    if (!root) return
    const stage = root.querySelector('[data-conik-studio-stage]') as HTMLElement | null
    if (!stage) return
    const remote = stage.children[0] as HTMLElement | undefined
    const screen = stage.children[1] as HTMLElement | undefined
    const camera = stage.children[2] as HTMLElement | undefined
    if (!remote || !screen || !camera) return
    remote.dataset.conikRemoteCanvas = 'true'
    screen.dataset.conikScreenCanvas = 'true'
    camera.dataset.conikCameraCanvas = 'true'

    if (!stage.querySelector('[data-conik-watermark]')) {
      const watermark = document.createElement('div')
      watermark.dataset.conikWatermark = 'true'
      watermark.setAttribute('aria-hidden', 'true')
      Object.assign(watermark.style, {
        position: 'absolute', inset: '0', zIndex: '0', pointerEvents: 'none', overflow: 'hidden',
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(4,1fr)',
        placeItems: 'center', opacity: '0.12'
      })
      for (let i = 0; i < 12; i++) {
        const mark = document.createElement('span')
        mark.textContent = 'Conik.io'
        Object.assign(mark.style, {
          color: '#fff', fontSize: 'clamp(18px,3vw,34px)', fontWeight: '900', letterSpacing: '.08em',
          transform: 'rotate(-24deg)', userSelect: 'none', whiteSpace: 'nowrap'
        })
        watermark.appendChild(mark)
      }
      stage.appendChild(watermark)
    }

    const applyLayout = () => {
      const screen = stage.querySelector('[data-conik-screen-canvas]') as HTMLElement | null
      const camera = stage.querySelector('[data-conik-camera-canvas]') as HTMLElement | null
      const remote = stage.querySelector('[data-conik-remote-canvas]') as HTMLElement | null
      if (!screen || !camera || !remote) return
      const active = screen.childElementCount > 0
      setHasScreen(active)

      stage.style.position = 'relative'
      stage.style.minHeight = 'clamp(500px, 68vh, 720px)'
      stage.style.overflow = 'hidden'
      stage.style.backgroundImage = `${(BACKGROUNDS.find(item => item.id === background) || BACKGROUNDS[0]).value}`
      stage.style.backgroundSize = 'cover'
      remote.style.position = 'relative'
      remote.style.zIndex = '1'
      const watermark = stage.querySelector('[data-conik-watermark]') as HTMLElement | null
      if (watermark) { watermark.style.display = active ? 'none' : 'grid'; watermark.style.zIndex = '0' }

      if (active && primary === 'screen') {
        screen.style.display = ''
        screen.style.left = '16px'; screen.style.right = '16px'; screen.style.top = '16px'; screen.style.bottom = '16px'
        screen.style.width = 'auto'; screen.style.height = 'auto'; screen.style.zIndex = '1'; screen.style.pointerEvents = 'none'
        camera.style.display = ''
        camera.style.width = '220px'; camera.style.height = '130px'; camera.style.zIndex = '4'; camera.style.right = 'auto'; camera.style.bottom = 'auto'
        if (cameraPosition) { camera.style.left = `${cameraPosition.x}px`; camera.style.top = `${cameraPosition.y}px` }
        else { camera.style.left = 'calc(100% - 236px)'; camera.style.top = 'calc(100% - 146px)' }
        camera.style.pointerEvents = 'auto'; camera.style.cursor = dragging ? 'grabbing' : 'grab'; camera.style.touchAction = 'none'; camera.style.transform = 'none'
        camera.style.boxShadow = '0 14px 35px rgba(0,0,0,.35)'; camera.style.border = '2px solid rgba(255,255,255,.72)'
      } else if (active && primary === 'camera') {
        screen.style.display = ''
        camera.style.display = ''
        camera.style.left = '16px'; camera.style.top = '16px'; camera.style.right = '16px'; camera.style.bottom = '16px'; camera.style.width = 'auto'; camera.style.height = 'auto'; camera.style.zIndex = '3'; camera.style.pointerEvents = 'none'; camera.style.transform = 'none'
        screen.style.left = 'auto'; screen.style.top = 'auto'; screen.style.right = '16px'; screen.style.bottom = '16px'; screen.style.width = '260px'; screen.style.height = '150px'; screen.style.zIndex = '4'; screen.style.pointerEvents = 'none'
        screen.style.borderRadius = '12px'; screen.style.overflow = 'hidden'; screen.style.boxShadow = '0 14px 35px rgba(0,0,0,.35)'
      } else {
        screen.style.display = 'none'
        camera.style.display = ''
        camera.style.width = 'min(78vw, 520px)'; camera.style.height = 'min(48vw, 300px)'; camera.style.right = 'auto'; camera.style.bottom = 'auto'; camera.style.zIndex = '3'; camera.style.pointerEvents = 'auto'; camera.style.cursor = dragging ? 'grabbing' : 'grab'; camera.style.touchAction = 'none'; camera.style.boxShadow = '0 18px 48px rgba(0,0,0,.35)'; camera.style.border = '2px solid rgba(255,255,255,.72)'
        if (cameraPosition) { camera.style.left = `${cameraPosition.x}px`; camera.style.top = `${cameraPosition.y}px`; camera.style.transform = 'none' }
        else { camera.style.left = '50%'; camera.style.top = '50%'; camera.style.transform = 'translate(-50%,-50%)' }
      }
    }

    applyLayout()
    const observer = new MutationObserver(applyLayout)
    observer.observe(stage, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [host, primary, background, dragging, cameraPosition])

  useEffect(() => {
    if (!host) return
    const root = rootRef.current
    if (!root) return
    const stage = root.querySelector('[data-conik-studio-stage]') as HTMLElement | null
    const camera = stage?.querySelector('[data-conik-camera-canvas]') as HTMLElement | null
    if (!stage || !camera) return
    let activePointer: number | null = null
    let startX = 0, startY = 0, originX = 0, originY = 0
    const getPosition = () => {
      const rect = stage.getBoundingClientRect(), c = camera.getBoundingClientRect()
      return {
        x: Math.max(8, Math.min(rect.width - c.width - 8, c.left - rect.left)),
        y: Math.max(8, Math.min(rect.height - c.height - 8, c.top - rect.top)),
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      if (hasScreen && primary !== 'screen') return
      activePointer = event.pointerId
      const pos = getPosition(); startX = event.clientX; startY = event.clientY; originX = pos.x; originY = pos.y
      camera.setPointerCapture?.(event.pointerId); setDragging(true); event.preventDefault()
    }
    const onPointerMove = (event: PointerEvent) => {
      if (activePointer !== event.pointerId) return
      const rect = stage.getBoundingClientRect(), c = camera.getBoundingClientRect()
      const x = Math.max(8, Math.min(rect.width - c.width - 8, originX + event.clientX - startX))
      const y = Math.max(8, Math.min(rect.height - c.height - 8, originY + event.clientY - startY))
      camera.style.left = `${x}px`; camera.style.top = `${y}px`; camera.style.right = 'auto'; camera.style.bottom = 'auto'; camera.style.transform = 'none'
      setCameraPosition({ x, y })
    }
    const onPointerUp = (event: PointerEvent) => { if (activePointer === event.pointerId) { activePointer = null; setDragging(false) } }
    camera.addEventListener('pointerdown', onPointerDown); camera.addEventListener('pointermove', onPointerMove); camera.addEventListener('pointerup', onPointerUp); camera.addEventListener('pointercancel', onPointerUp)
    return () => { camera.removeEventListener('pointerdown', onPointerDown); camera.removeEventListener('pointermove', onPointerMove); camera.removeEventListener('pointerup', onPointerUp); camera.removeEventListener('pointercancel', onPointerUp) }
  }, [host, primary, hasScreen])

  if (!host) return <>{children}</>

  return (
    <div ref={rootRef} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 270px', gap: 14, alignItems: 'start' }}>
      <div style={{ minWidth: 0 }}>
        <div data-conik-studio-stage-wrapper="true" style={{ minWidth: 0 }}>
          <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
        </div>
      </div>

      <aside style={{ ...panelStyle, position: 'sticky', top: 16, display: 'grid', gap: 10, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 9, borderBottom: '1px solid var(--line)' }}>
          <GripVertical size={17} />
          <div><b style={{ fontSize: 13 }}>Commandes du studio</b><div className="muted" style={{ fontSize: 11 }}>Mise en page</div></div>
        </div>

        <div style={{ display: 'grid', gap: 7 }}>
          <span className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Élément principal</span>
          <button type="button" className={primary === 'camera' ? 'primary' : 'outline'} onClick={() => setPrimary('camera')} style={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, width: '100%' }}><Camera size={15} /> Caméra en avant</button>
          {hasScreen && <button type="button" className={primary === 'screen' ? 'primary' : 'outline'} onClick={() => setPrimary('screen')} style={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, width: '100%' }}><MonitorUp size={15} /> Écran en avant</button>}
        </div>

        {!hasScreen && <div style={{ display: 'grid', gap: 8, paddingTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Palette size={16} /><b style={{ fontSize: 12 }}>Fond du studio</b></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {BACKGROUNDS.map(item => <button key={item.id} type="button" aria-label={`Fond ${item.label}`} title={item.label} onClick={() => setBackground(item.id)} style={{ width: '100%', aspectRatio: '1.35', borderRadius: 8, border: background === item.id ? '2px solid #fff' : '1px solid rgba(255,255,255,.25)', background: item.value, cursor: 'pointer', boxShadow: background === item.id ? '0 0 0 2px #0b5cff' : 'none' }} />)}
          </div>
          <span className="muted" style={{ fontSize: 11 }}>{BACKGROUNDS.find(item => item.id === background)?.label} · Filigrane Conik.io</span>
        </div>}

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 9, display: 'grid', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Move size={15} /><b style={{ fontSize: 12 }}>Position caméra</b></div>
          <p className="muted" style={{ margin: 0, fontSize: 11, lineHeight: 1.45 }}>Glissez votre caméra dans le studio pour la placer où vous voulez.</p>
        </div>
      </aside>
    </div>
  )
}
