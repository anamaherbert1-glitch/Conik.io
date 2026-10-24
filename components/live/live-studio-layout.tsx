'use client'

import { ReactNode, useState } from 'react'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'

type Props = {
  children: ReactNode
  host?: boolean
  sidebarContent?: ReactNode
}

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--line)',
  background: 'var(--panel)',
  borderRadius: 14,
  padding: 8,
}

export default function LiveStudioLayout({ children, host = false, sidebarContent }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (!host) return <>{children}</>

  return (
    <>
      <style>{`
        .conik-live-studio-layout{width:100%;min-width:0;box-sizing:border-box}
        .conik-live-studio-main{width:100%;min-width:0;max-width:100%}
        .live-studio-workspace{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;align-items:start;width:100%}
        .live-studio-chat{min-width:0;width:100%;margin-top:0}
        .live-studio-chat>.panel{min-height:420px!important;height:calc(100dvh - 120px);max-height:720px}
        .conik-live-studio-sidebar .choice[title^="http"]{display:none!important}
        @media (min-width:1280px){
          .conik-live-studio-layout{gap:12px!important}
          .conik-live-studio-sidebar{max-height:min(860px, calc(100dvh - 96px))!important}
        }
        @media (max-width:1023px){
          .live-studio-workspace{grid-template-columns:1fr!important;display:flex!important;flex-direction:column!important}
          .live-studio-chat{position:relative;top:auto;margin-top:0;display:block!important;width:100%!important;order:2}
          .live-studio-chat>.panel{height:auto;min-height:260px!important;max-height:min(420px, 45dvh);overflow:auto}
          .conik-live-studio-layout{grid-template-columns:1fr!important;gap:8px!important}
          .conik-live-studio-sidebar{position:relative!important;top:auto!important;right:auto!important;width:100%!important;max-height:none!important;order:3;box-shadow:none!important}
          .conik-live-studio-toggle{position:relative!important;top:auto!important;right:auto!important;margin-top:4px;width:44px!important;height:36px!important}
        }
        @media (max-width:640px){
          .conik-live-studio-layout{gap:6px!important;padding-bottom:max(8px, env(safe-area-inset-bottom))}
          .conik-live-studio-sidebar{width:100%!important;border-radius:12px!important}
          .live-studio-chat>.panel{min-height:220px!important;max-height:min(360px, 40dvh)}
          .conik-live-studio-toggle{width:100%!important;max-width:100%;height:40px!important;border-radius:12px!important}
        }
        @media (max-width:390px){
          .live-studio-chat>.panel{min-height:200px!important;max-height:min(320px, 38dvh)}
        }
      `}</style>

      <div
        className="conik-live-studio-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: sidebarOpen ? 'minmax(0, 1fr) minmax(180px, 240px)' : 'minmax(0, 1fr)',
          gap: 8,
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          alignItems: 'start',
          boxSizing: 'border-box',
        }}
      >
        <div className="conik-live-studio-main" style={{ width: '100%', minWidth: 0 }}>
          <div style={{ width: '100%', minWidth: 0 }}>{children}</div>
          <button
            type="button"
            className="conik-live-studio-toggle"
            aria-label={sidebarOpen ? 'Masquer le panneau' : 'Afficher le panneau'}
            title={sidebarOpen ? 'Masquer' : 'Afficher'}
            onClick={() => setSidebarOpen((v) => !v)}
            style={{ marginTop: 4, width: 42, height: 32, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--text)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            {sidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {sidebarOpen && (
          <aside
            className="conik-live-studio-sidebar"
            style={{ ...panelStyle, width: '100%', maxHeight: 'min(820px, calc(100vh - 100px))', overflowY: 'auto', display: 'grid', gap: 5, minWidth: 0, position: 'sticky', top: 4, boxShadow: '0 12px 32px rgba(0,0,0,.1)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 3, borderBottom: '1px solid var(--line)' }}>
              <GripVertical size={14} />
              <b style={{ fontSize: 12 }}>Outils du Live</b>
            </div>
            {sidebarContent}
          </aside>
        )}
      </div>
    </>
  )
}
