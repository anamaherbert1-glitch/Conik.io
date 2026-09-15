'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { Camera, MonitorUp, Move, Palette, GripVertical } from 'lucide-react'

type Background = { id: string; label: string; value: string }
type Position = { x: number; y: number }
type DragTarget = 'camera' | 'screen'

const BACKGROUNDS: Background[] = [
  { id: 'white', label: 'Blanc', value: 'linear-gradient(135deg,#ffffff 0%,#f1f5f9 55%,#e2e8f0 100%)' },
  { id: 'blue', label: 'Bleu', value: 'linear-gradient(135deg,#071a3d 0%,#0b5cff 55%,#48b8ff 100%)' },
  { id: 'violet', label: 'Violet', value: 'linear-gradient(135deg,#160a35 0%,#6d28d9 55%,#b56cff 100%)' },
  { id: 'cyan', label: 'Cyan', value: 'linear-gradient(135deg,#062a35 0%,#087f9b 55%,#54e0ff 100%)' },
  { id: 'dark', label: 'Sombre', value: 'linear-gradient(135deg,#05060a 0%,#111827 55%,#273449 100%)' },
]

const panelStyle: React.CSSProperties = { border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 14, padding: 12 }

export default function LiveStudioLayout({ children, host = false }: { children: ReactNode; host?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [primary, setPrimary] = useState<'camera' | 'screen'>('camera')
  const [background, setBackground] = useState(BACKGROUNDS[1].id)
  const [hasScreen, setHasScreen] = useState(false)
  const [dragTarget, setDragTarget] = useState<DragTarget>('camera')
  const [dragging, setDragging] = useState(false)
  const [cameraPosition, setCameraPosition] = useState<Position | null>(null)
  const [screenPosition, setScreenPosition] = useState<Position | null>(null)

  useEffect(() => {
    if (!host) return
    const root = rootRef.current
    if (!root) return
    const stage = root.querySelector('[data-conik-studio-stage]') as HTMLElement | null
    if (!stage) return

    const remote = stage.querySelector('[data-conik-remote-canvas]') as HTMLElement | null || stage.children[0] as HTMLElement | null
    const screen = stage.querySelector('[data-conik-screen-canvas]') as HTMLElement | null || stage.children[1] as HTMLElement | null
    const camera = stage.querySelector('[data-conik-camera-canvas]') as HTMLElement | null || stage.children[2] as HTMLElement | null
    if (!remote || !screen || !camera) return

    remote.dataset.conikRemoteCanvas = 'true'
    screen.dataset.conikScreenCanvas = 'true'
    camera.dataset.conikCameraCanvas = 'true'

    let backdrop = stage.querySelector('[data-conik-studio-background]') as HTMLElement | null
    if (!backdrop) {
      backdrop = document.createElement('div')
      backdrop.dataset.conikStudioBackground = 'true'
      Object.assign(backdrop.style, {
        position: 'absolute', inset: '0', zIndex: '0', pointerEvents: 'none',
        backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundSize: 'cover',
      })
      stage.prepend(backdrop)
    }

    if (!stage.querySelector('[data-conik-watermark]')) {
      const watermark = document.createElement('div')
      watermark.dataset.conikWatermark = 'true'
      watermark.setAttribute('aria-hidden', 'true')
      Object.assign(watermark.style, {
        position: 'absolute', inset: '0', zIndex: '0', pointerEvents: 'none', overflow: 'hidden',
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(4,1fr)',
        placeItems: 'center', opacity: '0.12',
      })
      for (let i = 0; i < 12; i++) {
        const mark = document.createElement('span')
        mark.textContent = 'Conik.io'
        Object.assign(mark.style, { color: '#fff', fontSize: 'clamp(18px,3vw,34px)', fontWeight: '900', letterSpacing: '.08em', transform: 'rotate(-24deg)', userSelect: 'none', whiteSpace: 'nowrap' })
        watermark.appendChild(mark)
      }
      stage.appendChild(watermark)
    }

    const applyLayout = () => {
      const currentScreen = stage.querySelector('[data-conik-screen-canvas]') as HTMLElement | null
      const currentCamera = stage.querySelector('[data-conik-camera-canvas]') as HTMLElement | null
      const currentRemote = stage.querySelector('[data-conik-remote-canvas]') as HTMLElement | null
      if (!currentScreen || !currentCamera || !currentRemote) return

      const active = currentScreen.childElementCount > 0
      setHasScreen(previous => previous === active ? previous : active)

      const selectedBackground = BACKGROUNDS.find(item => item.id === background) || BACKGROUNDS[0]
      stage.style.position = 'relative'
      stage.style.minHeight = 'clamp(500px, 68vh, 720px)'
      stage.style.overflow = 'hidden'
      stage.style.background = 'transparent'
      stage.style.isolation = 'isolate'
      currentRemote.style.position = 'relative'
      currentRemote.style.zIndex = '1'
      currentRemote.style.background = 'transparent'
      if (backdrop) backdrop.style.background = selectedBackground.value

      const watermark = stage.querySelector('[data-conik-watermark]') as HTMLElement | null
      if (watermark) {
        watermark.style.display = active ? 'none' : 'grid'
        watermark.style.zIndex = '0'
      }

      if (active && primary === 'screen') {
        currentScreen.style.display = ''
        currentScreen.style.width = screenPosition ? 'min(82%, 1100px)' : 'auto'
        currentScreen.style.height = screenPosition ? 'min(78%, 620px)' : 'auto'
        currentScreen.style.left = screenPosition ? `${screenPosition.x}px` : '16px'
        currentScreen.style.top = screenPosition ? `${screenPosition.y}px` : '16px'
        currentScreen.style.right = screenPosition ? 'auto' : '16px'
        currentScreen.style.bottom = screenPosition ? 'auto' : '16px'
        currentScreen.style.zIndex = '2'
        currentScreen.style.pointerEvents = 'auto'
        currentScreen.style.touchAction = 'none'
        currentScreen.style.cursor = dragging && dragTarget === 'screen' ? 'grabbing' : 'grab'
        currentScreen.style.borderRadius = '12px'
        currentScreen.style.overflow = 'hidden'
        currentScreen.style.boxShadow = '0 14px 35px rgba(0,0,0,.35)'

        currentCamera.style.display = ''
        currentCamera.style.width = '220px'
        currentCamera.style.height = '130px'
        currentCamera.style.zIndex = '4'
        currentCamera.style.right = 'auto'
        currentCamera.style.bottom = 'auto'
        currentCamera.style.pointerEvents = 'auto'
        currentCamera.style.touchAction = 'none'
        currentCamera.style.cursor = dragging && dragTarget === 'camera' ? 'grabbing' : 'grab'
        currentCamera.style.transform = 'none'
        currentCamera.style.boxShadow = '0 14px 35px rgba(0,0,0,.35)'
        currentCamera.style.border = '2px solid rgba(255,255,255,.72)'
        if (cameraPosition) {
          currentCamera.style.left = `${cameraPosition.x}px`
          currentCamera.style.top = `${cameraPosition.y}px`
        } else {
          currentCamera.style.left = 'calc(100% - 236px)'
          currentCamera.style.top = 'calc(100% - 146px)'
        }
      } else if (active && primary === 'camera') {
        currentCamera.style.display = ''
        currentCamera.style.left = '16px'
        currentCamera.style.top = '16px'
        currentCamera.style.right = '16px'
        currentCamera.style.bottom = '16px'
        currentCamera.style.width = 'auto'
        currentCamera.style.height = 'auto'
        currentCamera.style.zIndex = '3'
        currentCamera.style.pointerEvents = 'auto'
        currentCamera.style.touchAction = 'none'
        currentCamera.style.cursor = dragging && dragTarget === 'camera' ? 'grabbing' : 'grab'
        currentCamera.style.transform = 'none'
        currentCamera.style.boxShadow = '0 14px 35px rgba(0,0,0,.35)'

        currentScreen.style.display = ''
        currentScreen.style.left = screenPosition ? `${screenPosition.x}px` : 'auto'
        currentScreen.style.top = screenPosition ? `${screenPosition.y}px` : 'auto'
        currentScreen.style.right = screenPosition ? 'auto' : '16px'
        currentScreen.style.bottom = screenPosition ? 'auto' : '16px'
        currentScreen.style.width = screenPosition ? '260px' : '260px'
        currentScreen.style.height = '150px'
        currentScreen.style.zIndex = '4'
        currentScreen.style.pointerEvents = 'auto'
        currentScreen.style.touchAction = 'none'
        currentScreen.style.cursor = dragging && dragTarget === 'screen' ? 'grabbing' : 'grab'
        currentScreen.style.borderRadius = '12px'
        currentScreen.style.overflow = 'hidden'
        currentScreen.style.boxShadow = '0 14px 35px rgba(0,0,0,.35)'
      } else {
        currentScreen.style.display = 'none'
        currentCamera.style.display = ''
        currentCamera.style.width = 'min(78vw, 520px)'
        currentCamera.style.height = 'min(48vw, 300px)'
        currentCamera.style.right = 'auto'
        currentCamera.style.bottom = 'auto'
        currentCamera.style.zIndex = '3'
        currentCamera.style.pointerEvents = 'auto'
        currentCamera.style.cursor = dragging ? 'grabbing' : 'grab'
        currentCamera.style.touchAction = 'none'
        currentCamera.style.boxShadow = '0 18px 48px rgba(0,0,0,.35)'
        currentCamera.style.border = '2px solid rgba(255,255,255,.72)'
        if (cameraPosition) {
          currentCamera.style.left = `${cameraPosition.x}px`
          currentCamera.style.top = `${cameraPosition.y}px`
          currentCamera.style.transform = 'none'
        } else {
          currentCamera.style.left = '50%'
          currentCamera.style.top = '50%'
          currentCamera.style.transform = 'translate(-50%,-50%)'
        }
      }
    }

    applyLayout()
    const observer = new MutationObserver(applyLayout)
    observer.observe(stage, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [host, primary, background, dragging, dragTarget, cameraPosition, screenPosition])

  useEffect(() => {
    if (!host) return
    const root = rootRef.current
    if (!root) return
    const stage = root.querySelector('[data-conik-studio-stage]') as HTMLElement | null
    if (!stage) return

    const targets: Array<[DragTarget, string]> = [['camera', '[data-conik-camera-canvas]'], ['screen', '[data-conik-screen-canvas]']]
    const cleanups: Array<() => void> = []

    targets.forEach(([target, selector]) => {
      const element = stage.querySelector(selector) as HTMLElement | null
      if (!element) return
      let activePointer: number | null = null
      let startX = 0
      let startY = 0
      let originX = 0
      let originY = 0

      const getPosition = () => {
        const rect = stage.getBoundingClientRect()
        const item = element.getBoundingClientRect()
        return {
          x: Math.max(8, Math.min(rect.width - item.width - 8, item.left - rect.left)),
          y: Math.max(8, Math.min(rect.height - item.height - 8, item.top - rect.top)),
        }
      }

      const onPointerDown = (event: PointerEvent) => {
        if (target === 'screen' && !hasScreen) return
        if (target !== dragTarget) return
        activePointer = event.pointerId
        const position = getPosition()
        startX = event.clientX
        startY = event.clientY
        originX = position.x
        originY = position.y
        element.setPointerCapture?.(event.pointerId)
        setDragging(true)
        event.preventDefault()
        event.stopPropagation()
      }

      const onPointerMove = (event: PointerEvent) => {
        if (activePointer !== event.pointerId) return
        const rect = stage.getBoundingClientRect()
        const item = element.getBoundingClientRect()
        const x = Math.max(8, Math.min(rect.width - item.width - 8, originX + event.clientX - startX))
        const y = Math.max(8, Math.min(rect.height - item.height - 8, originY + event.clientY - startY))
        element.style.left = `${x}px`
        element.style.top = `${y}px`
        element.style.right = 'auto'
        element.style.bottom = 'auto'
        element.style.transform = 'none'
        if (target === 'camera') setCameraPosition({ x, y })
        else setScreenPosition({ x, y })
      }

      const onPointerUp = (event: PointerEvent) => {
        if (activePointer === event.pointerId) {
          activePointer = null
          setDragging(false)
        }
      }

      element.addEventListener('pointerdown', onPointerDown)
      element.addEventListener('pointermove', onPointerMove)
      element.addEventListener('pointerup', onPointerUp)
      element.addEventListener('pointercancel', onPointerUp)
      cleanups.push(() => {
        element.removeEventListener('pointerdown', onPointerDown)
        element.removeEventListener('pointermove', onPointerMove)
        element.removeEventListener('pointerup', onPointerUp)
        element.removeEventListener('pointercancel', onPointerUp)
      })
    })

    return () => cleanups.forEach(cleanup => cleanup())
  }, [host, hasScreen, dragTarget, primary])

  if (!host) return <>{children}</>

  const resetPositions = () => {
    setCameraPosition(null)
    setScreenPosition(null)
  }

  return (
    <>
      <style>{`@media (max-width: 860px){.conik-live-studio-layout{grid-template-columns:1fr!important}.conik-live-studio-sidebar{position:relative!important;top:auto!important}.conik-live-studio-main{min-width:0}.conik-live-studio-sidebar button{min-height:42px!important}}`}</style>
      <div ref={rootRef} className="conik-live-studio-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 270px', gap: 14, alignItems: 'start' }}>
        <div className="conik-live-studio-main" style={{ minWidth: 0 }}>
          <div style={{ minWidth: 0 }}><div style={{ position: 'relative', zIndex: 1 }}>{children}</div></div>
        </div>
        <aside className="conik-live-studio-sidebar" style={{ ...panelStyle, position: 'sticky', top: 16, display: 'grid', gap: 10, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 9, borderBottom: '1px solid var(--line)' }}><GripVertical size={17} /><div><b style={{ fontSize: 13 }}>Commandes du studio</b><div className="muted" style={{ fontSize: 11 }}>Mise en page</div></div></div>
          <div style={{ display: 'grid', gap: 7 }}>
            <span className="muted" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Élément principal</span>
            <button type="button" className={primary === 'camera' ? 'primary' : 'outline'} onClick={() => setPrimary('camera')} style={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, width: '100%' }}><Camera size={15} /> Caméra en avant</button>
            {hasScreen && <button type="button" className={primary === 'screen' ? 'primary' : 'outline'} onClick={() => setPrimary('screen')} style={{ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, width: '100%' }}><MonitorUp size={15} /> Écran en avant</button>}
          </div>
          {!hasScreen && <div style={{ display: 'grid', gap: 8, paddingTop: 4 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Palette size={16} /><b style={{ fontSize: 12 }}>Fond du studio</b></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>{BACKGROUNDS.map(item => <button key={item.id} type="button" aria-label={`Fond ${item.label}`} title={item.label} onClick={() => setBackground(item.id)} style={{ width: '100%', aspectRatio: '1.35', borderRadius: 8, border: background === item.id ? '2px solid #fff' : '1px solid rgba(255,255,255,.25)', background: item.value, cursor: 'pointer', boxShadow: background === item.id ? '0 0 0 2px #0b5cff' : 'none' }} />)}</div><span className="muted" style={{ fontSize: 11 }}>{BACKGROUNDS.find(item => item.id === background)?.label} · Filigrane Conik.io</span></div>}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 9, display: 'grid', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Move size={15} /><b style={{ fontSize: 12 }}>Déplacer un élément</b></div>
            <div style={{ display: 'grid', gridTemplateColumns: hasScreen ? '1fr 1fr' : '1fr', gap: 6 }}>
              <button type="button" className={dragTarget === 'camera' ? 'primary' : 'outline'} onClick={() => setDragTarget('camera')} style={{ minHeight: 38, fontSize: 12 }}>Caméra</button>
              {hasScreen && <button type="button" className={dragTarget === 'screen' ? 'primary' : 'outline'} onClick={() => setDragTarget('screen')} style={{ minHeight: 38, fontSize: 12 }}>Écran</button>}
            </div>
            <span className="muted" style={{ fontSize: 11, lineHeight: 1.4 }}>Sélectionnez un élément puis faites-le glisser directement dans le studio.</span>
            <button type="button" className="outline" onClick={resetPositions} style={{ minHeight: 36, fontSize: 11 }}>Réinitialiser les positions</button>
          </div>
        </aside>
      </div>
    </>
  )
}
