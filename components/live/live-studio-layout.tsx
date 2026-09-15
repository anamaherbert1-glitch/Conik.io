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
  padding: 12,
}

/**
 * Layout du studio organisateur.
 * Les contrôles caméra / fond / déplacement sont gérés dans MultiLiveRoom
 * (synchronisés vers les followers). Ici : uniquement le panneau invités / outils.
 */
export default function LiveStudioLayout({ children, host = false, sidebarContent }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (!host) return <>{children}</>

  return (
    <>
      <style>{`
        @media (max-width:980px){
          .conik-live-studio-layout{grid-template-columns:1fr!important}
          .conik-live-studio-sidebar{position:relative!important;top:auto!important;right:auto!important;width:100%!important;max-height:none!important}
          .conik-live-studio-toggle{position:relative!important;top:auto!important;right:auto!important;margin-top:8px;width:100%!important;height:40px!important}
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
          gridTemplateColumns: sidebarOpen ? 'minmax(0, 1fr) 248px' : 'minmax(0, 1fr)',
          gap: 14,
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
            style={{
              marginTop: 8,
              width: 42,
              height: 36,
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--panel)',
              color: 'var(--text)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 8px 22px rgba(0,0,0,.12)',
              cursor: 'pointer',
            }}
          >
            {sidebarOpen ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>

        {sidebarOpen && (
          <aside
            className="conik-live-studio-sidebar"
            style={{
              ...panelStyle,
              width: '100%',
              maxHeight: 'min(820px, calc(100vh - 120px))',
              overflowY: 'auto',
              display: 'grid',
              gap: 10,
              minWidth: 0,
              position: 'sticky',
              top: 12,
              boxShadow: '0 18px 48px rgba(0,0,0,.14)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingBottom: 8,
                borderBottom: '1px solid var(--line)',
              }}
            >
              <GripVertical size={16} />
              <div style={{ minWidth: 0 }}>
                <b style={{ fontSize: 13 }}>Outils du Live</b>
                <div className="muted" style={{ fontSize: 10 }}>
                  Invités, organisateurs, chat
                </div>
              </div>
            </div>

            {sidebarContent}
          </aside>
        )}
      </div>
    </>
  )
}
