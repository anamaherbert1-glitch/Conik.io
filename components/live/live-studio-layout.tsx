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
        .live-studio-workspace{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;align-items:start}
        .live-studio-chat{min-width:0;width:100%;margin-top:0}
        .live-studio-chat>.panel{min-height:680px!important;height:calc(100vh - 100px);max-height:820px}
        .conik-live-studio-sidebar .choice[title^="http"]{display:none!important}
        @media (max-width:980px){
          .live-studio-workspace{grid-template-columns:1fr!important}
          .live-studio-chat{position:relative;top:auto;margin-top:0}
          .live-studio-chat>.panel{height:auto;min-height:520px!important;max-height:none}
          .conik-live-studio-layout{grid-template-columns:1fr!important}
          .conik-live-studio-sidebar{position:relative!important;top:auto!important;right:auto!important;width:100%!important;max-height:none!important}
          .conik-live-studio-toggle{position:relative!important;top:auto!important;right:auto!important;margin-top:4px;width:42px!important;height:32px!important}
        }
        @media (max-width:760px){
          .conik-live-studio-stage{aspect-ratio:16/9!important;min-height:0!important;height:auto!important}
          .conik-live-studio-sidebar{width:100%!important}
        }
      `}</style>

      <div
        className="conik-live-studio-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: sidebarOpen ? 'minmax(0, 1fr) 220px' : 'minmax(0, 1fr)',
          gap: 8,
          width: '100%',
          minWidth: 0,
          alignItems: 'start',
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
