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
        .conik-live-studio-sidebar > :nth-child(3){
          display:flex!important;
          align-items:center!important;
          gap:6px!important;
          padding-top:5px!important;
        }
        .conik-live-studio-sidebar > :nth-child(3) > .muted{
          display:none!important;
        }
        .conik-live-studio-sidebar > :nth-child(3) > button{
          flex:0 0 38px!important;
          width:38px!important;
          min-width:38px!important;
          height:38px!important;
          min-height:38px!important;
          padding:0!important;
          font-size:0!important;
        }
        .conik-live-studio-sidebar > :nth-child(3) > button svg{
          width:17px!important;
          height:17px!important;
        }
        .conik-live-studio-sidebar > :nth-child(3) > div[style*='margin-top']{
          flex:1 1 auto!important;
          min-width:0!important;
          display:flex!important;
          align-items:center!important;
          gap:5px!important;
          margin-top:0!important;
        }
        .conik-live-studio-sidebar > :nth-child(3) > div[style*='margin-top'] > .choice{
          flex:1 1 auto!important;
          min-width:0!important;
          max-height:38px!important;
          overflow:hidden!important;
          white-space:nowrap!important;
          text-overflow:ellipsis!important;
        }
        .conik-live-studio-sidebar > :nth-child(3) > div[style*='margin-top'] > button{
          flex:0 0 34px!important;
          width:34px!important;
          min-width:34px!important;
          min-height:34px!important;
          padding:0!important;
          font-size:0!important;
        }
        .conik-live-studio-sidebar > :nth-child(3) > div[style*='margin-top'] > button svg{
          width:14px!important;
          height:14px!important;
        }
      `}</style>

      <div
        className="conik-live-studio-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: sidebarOpen ? 'minmax(0, 1fr) 248px' : 'minmax(0, 1fr)',
          gap: 10,
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
              gap: 8,
              minWidth: 0,
              position: 'sticky',
              top: 4,
              boxShadow: '0 18px 48px rgba(0,0,0,.14)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                paddingBottom: 6,
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
