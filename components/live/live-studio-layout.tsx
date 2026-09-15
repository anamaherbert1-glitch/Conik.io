'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { Camera, ChevronLeft, ChevronRight, GripVertical, MonitorUp, Move, Palette, RotateCcw } from 'lucide-react'

type Background = { id: string; label: string; value: string }
type Position = { x: number; y: number }
type DragTarget = 'camera' | 'screen'
type Primary = 'none' | 'camera' | 'screen'

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

type Props = {
  children: ReactNode
  host?: boolean
  sidebarContent?: ReactNode
}

const CAMERA_W = 180
const CAMERA_H = 102
const OVERLAY_W = 260
const OVERLAY_H = 146

export default function LiveStudioLayout({ children, host = false, sidebarContent }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [primary, setPrimary] = useState<Primary>('none')
  const [background, setBackground] = useState(BACKGROUNDS[1].id)
  const [hasScreen, setHasScreen] = useState(false)
  const [dragTarget, setDragTarget] = useState<DragTarget>('camera')
  const [moveEnabled, setMoveEnabled] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [cameraPosition, setCameraPosition] = useState<Position | null>(null)
  const [screenPosition, setScreenPosition] = useState<Position | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
      const currentBackdrop = stage.querySelector('[data-conik-studio-background]') as HTMLElement | null
      if (!currentScreen || !currentCamera || !currentRemote) return

      const active = currentScreen.childElementCount > 0
      setHasScreen(previous => previous === active ? previous : active)

      const selectedBackground = BACKGROUNDS.find(item => item.id === background) || BACKGROUNDS[0]
      stage.style.position = 'relative'
      stage.style.width = '100%'
      stage.style.aspectRatio = '16 / 9'
      stage.style.minHeight = '0'
      stage.style.height = 'auto'
      stage.style.overflow = 'hidden'
      stage.style.background = 'transparent'
      stage.style.isolation = 'isolate'

      currentRemote.style.position = 'absolute'
      currentRemote.style.inset = '0'
      currentRemote.style.width = '100%'
      currentRemote.style.height = '100%'
      currentRemote.style.minHeight = '0'
      currentRemote.style.zIndex = '1'
      currentRemote.style.background = 'transparent'
      if (currentBackdrop) currentBackdrop.style.background = selectedBackground.value

      const watermark = stage.querySelector('[data-conik-watermark]') as HTMLElement | null
      if (watermark) {
        watermark.style.display = active ? 'none' : 'grid'
        watermark.style.zIndex = '0'
      }

      const cameraIsPrimary = primary === 'camera'
      const screenIsPrimary = active && (primary === 'screen' || primary === 'none')

      const setupFloating = (element: HTMLElement, width: number, height: number, zIndex: string, position: Position | null, fallbackX: string, fallbackY: string) => {
        element.style.display = ''
        element.style.width = `${width}px`
        element.style.height = `${height}px`
        element.style.left = position ? `${position.x}px` : fallbackX
        element.style.top = position ? `${position.y}px` : fallbackY
        element.style.right = 'auto'
        element.style.bottom = 'auto'
        element.style.zIndex = zIndex
        element.style.pointerEvents = 'auto'
        element.style.touchAction = moveEnabled ? 'none' : 'auto'
        element.style.cursor = moveEnabled && dragTarget === (element === currentCamera ? 'camera' : 'screen') ? (dragging ? 'grabbing' : 'grab') : 'default'
        element.style.transform = 'none'
        element.style.borderRadius = '12px'
        element.style.overflow = 'hidden'
        element.style.boxShadow = '0 14px 35px rgba(0,0,0,.35)'
        element.style.border = element === currentCamera ? '2px solid rgba(255,255,255,.72)' : '1px solid rgba(255,255,255,.2)'
      }

      if (cameraIsPrimary) {
        currentCamera.style.display = ''
        currentCamera.style.left = '12px'
        currentCamera.style.top = '12px'
        currentCamera.style.right = '12px'
        currentCamera.style.bottom = '12px'
        currentCamera.style.width = 'auto'
        currentCamera.style.height = 'auto'
        currentCamera.style.zIndex = '3'
        currentCamera.style.pointerEvents = 'auto'
        currentCamera.style.touchAction = moveEnabled && dragTarget === 'camera' ? 'none' : 'auto'
        currentCamera.style.cursor = moveEnabled && dragTarget === 'camera' ? (dragging ? 'grabbing' : 'grab') : 'default'
        currentCamera.style.transform = 'none'
        currentCamera.style.boxShadow = '0 14px 35px rgba(0,0,0,.35)'
        currentCamera.style.border = '1px solid rgba(255,255,255,.14)'

        if (active) setupFloating(currentScreen, OVERLAY_W, OVERLAY_H, '4', screenPosition, `calc(100% - ${OVERLAY_W + 18}px)`, `calc(100% - ${OVERLAY_H + 18}px)`)
        else currentScreen.style.display = 'none'
        return
      }

      if (screenIsPrimary) {
        currentScreen.style.display = ''
        currentScreen.style.left = '10px'
        currentScreen.style.top = '10px'
        currentScreen.style.right = '10px'
        currentScreen.style.bottom = '10px'
        currentScreen.style.width = 'auto'
        currentScreen.style.height = 'auto'
        currentScreen.style.zIndex = '2'
        currentScreen.style.pointerEvents = 'auto'
        currentScreen.style.touchAction = moveEnabled && dragTarget === 'screen' ? 'none' : 'auto'
        currentScreen.style.cursor = moveEnabled && dragTarget === 'screen' ? (dragging ? 'grabbing' : 'grab') : 'default'
        currentScreen.style.borderRadius = '12px'
        currentScreen.style.overflow = 'hidden'
        currentScreen.style.boxShadow = '0 14px 35px rgba(0,0,0,.35)'
        currentScreen.style.border = '1px solid rgba(255,255,255,.16)'

        setupFloating(currentCamera, CAMERA_W, CAMERA_H, '4', cameraPosition, `calc(100% - ${CAMERA_W + 18}px)`, `calc(100% - ${CAMERA_H + 18}px)`)
        return
      }

      currentScreen.style.display = 'none'
      setupFloating(currentCamera, CAMERA_W, CAMERA_H, '3', cameraPosition, `calc(100% - ${CAMERA_W + 18}px)`, `calc(100% - ${CAMERA_H + 18}px)`)
    }

    applyLayout()
    const observer = new MutationObserver(applyLayout)
    observer.observe(stage, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [host, primary, background, dragging, dragTarget, moveEnabled, cameraPosition, screenPosition])

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
          x: Math.max(8, Math.min(Math.max(8, rect.width - item.width - 8), item.left - rect.left)),
          y: Math.max(8, Math.min(Math.max(8, rect.height - item.height - 8), item.top - rect.top)),
        }
      }

      const onPointerDown = (event: PointerEvent) => {
        if (!moveEnabled || target !== dragTarget) return
        if (target === 'screen' && !hasScreen) return
        if (primary === 'camera' && target === 'camera') return
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
        const x = Math.max(8, Math.min(Math.max(8, rect.width - item.width - 8), originX + event.clientX - startX))
        const y = Math.max(8, Math.min(Math.max(8, rect.height - item.height - 8), originY + event.clientY - startY))
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
  }, [host, hasScreen, dragTarget, primary, moveEnabled])

  if (!host) return <>{children}</>

  const resetPositions = () => {
    setCameraPosition(null)
    setScreenPosition(null)
  }

  const toggleCameraPrimary = () => setPrimary(value => value === 'camera' ? 'none' : 'camera')
  const toggleScreenPrimary = () => setPrimary(value => value === 'screen' ? 'none' : 'screen')

  return (
    <>
      <style>{`@media (max-width:980px){.conik-live-studio-layout{grid-template-columns:1fr!important}.conik-live-studio-sidebar{position:relative!important;top:auto!important;right:auto!important;width:100%!important;max-height:none!important}.conik-live-studio-toggle{position:relative!important;top:auto!important;right:auto!important;margin-top:8px;width:100%!important;height:40px!important}}@media (max-width:760px){.conik-live-studio-stage{aspect-ratio:16/9!important;min-height:0!important;height:auto!important}.conik-live-studio-sidebar{width:100%!important}}`}</style>
      <div ref={rootRef} className="conik-live-studio-layout" style={{ display: 'grid', gridTemplateColumns: sidebarOpen ? 'minmax(0, 1fr) 248px' : 'minmax(0, 1fr)', gap: 14, width: '100%', minWidth: 0, alignItems: 'start' }}>
        <div className="conik-live-studio-main" style={{ width: '100%', minWidth: 0 }}>
          <div style={{ width: '100%', minWidth: 0 }}>{children}</div>
          <button
            type="button"
            className="conik-live-studio-toggle"
            aria-label={sidebarOpen ? 'Masquer les outils du studio' : 'Afficher les outils du studio'}
            title={sidebarOpen ? 'Masquer les outils' : 'Afficher les outils'}
            onClick={() => setSidebarOpen(value => !value)}
            style={{ marginTop: 8, width: 42, height: 36, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--text)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 22px rgba(0,0,0,.12)', cursor: 'pointer' }}
          >
            {sidebarOpen ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>

        {sidebarOpen && <aside
          className="conik-live-studio-sidebar"
          style={{ ...panelStyle, width: '100%', maxHeight: 'min(820px, calc(100vh - 120px))', overflowY: 'auto', display: 'grid', gap: 10, minWidth: 0, position: 'sticky', top: 12, boxShadow: '0 18px 48px rgba(0,0,0,.14)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--line)' }}>
            <GripVertical size={16} />
            <div style={{ minWidth: 0 }}><b style={{ fontSize: 13 }}>Outils du Live</b><div className="muted" style={{ fontSize: 10 }}>Panneau externe au studio</div></div>
          </div>

          <div style={{ display: 'grid', gap: 7 }}>
            <span className="muted" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>Élément principal</span>
            <button type="button" className={primary === 'camera' ? 'primary' : 'outline'} onClick={toggleCameraPrimary} style={{ minHeight: 38, display: 'flex', alignItems: 'center', gap: 7, width: '100%' }}><Camera size={14} /> {primary === 'camera' ? 'Remettre la caméra en petit' : 'Mettre la caméra en avant'}</button>
            {hasScreen && <button type="button" className={primary === 'screen' ? 'primary' : 'outline'} onClick={toggleScreenPrimary} style={{ minHeight: 38, display: 'flex', alignItems: 'center', gap: 7, width: '100%' }}><MonitorUp size={14} /> {primary === 'screen' ? 'Remettre l’écran en arrière-plan' : 'Mettre l’écran en avant'}</button>}
            <div className="muted" style={{ fontSize: 10, lineHeight: 1.35 }}>La caméra reste petite par défaut. Un clic l’agrandit, un deuxième clic la remet en petit.</div>
          </div>

          <div style={{ display: 'grid', gap: 7 }}>
            <span className="muted" style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>Déplacement</span>
            <button type="button" className={moveEnabled ? 'primary' : 'outline'} onClick={() => { setMoveEnabled(value => !value); setDragging(false) }} style={{ minHeight: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%' }}><Move size={14} /> {moveEnabled ? 'Désactiver le déplacement' : 'Activer le déplacement'}</button>
            <div style={{ display: 'grid', gridTemplateColumns: hasScreen ? '1fr 1fr' : '1fr', gap: 6 }}>
              <button type="button" className={dragTarget === 'camera' ? 'primary' : 'outline'} disabled={!moveEnabled} onClick={() => setDragTarget('camera')} style={{ minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: moveEnabled ? 1 : .55 }}><Camera size={13} /> Caméra</button>
              {hasScreen && <button type="button" className={dragTarget === 'screen' ? 'primary' : 'outline'} disabled={!moveEnabled} onClick={() => setDragTarget('screen')} style={{ minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: moveEnabled ? 1 : .55 }}><MonitorUp size={13} /> Écran</button>}
            </div>
            <div className="muted" style={{ fontSize: 10, lineHeight: 1.35 }}>{moveEnabled ? `Déplacement activé pour ${dragTarget === 'camera' ? 'la caméra' : 'l’écran'}. Faites glisser l’élément.` : 'Activez le déplacement avant de pouvoir déplacer un élément.'}</div>
            <button type="button" className="outline" onClick={resetPositions} style={{ minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><RotateCcw size={13} /> Réinitialiser</button>
          </div>

          <div style={{ display: 'grid', gap: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Palette size={14} /><span style={{ fontSize: 11, fontWeight: 800 }}>Arrière-plan</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
              {BACKGROUNDS.map(item => <button key={item.id} type="button" aria-label={item.label} title={item.label} onClick={() => setBackground(item.id)} style={{ height: 28, borderRadius: 7, border: background === item.id ? '2px solid var(--text)' : '1px solid var(--line)', background: item.value, cursor: 'pointer', padding: 0 }} />)}
            </div>
          </div>

          {sidebarContent && <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}>{sidebarContent}</div>}
        </aside>}
      </div>
    </>
  )
}
