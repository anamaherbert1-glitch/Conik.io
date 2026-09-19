'use client'

import Link from 'next/link'
import {
  LayoutDashboard, Zap, Users, Send, Bot, MessageSquare, MousePointer2, BarChart3, Globe2,
  Settings2, LogOut, Plug, BookOpen, Radio, CreditCard, ChevronDown, Wallet, LineChart,
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { usePreferences } from '@/components/preferences-provider'
import { useState } from 'react'

const itemsBefore = [
  ['Dashboard', LayoutDashboard, '/dashboard'],
] as const

const itemsAfter = [
  ['Funnels', Zap, '/funnels'],
  ['Contacts', Users, '/contacts'],
  ['Campaigns', Send, '/campaigns'],
  ['Automations', Bot, '/automations'],
  ['Live Events', Radio, '/lives'],
  ['Links', MousePointer2, '/links'],
  ['Domains', Globe2, '/domains'],
] as const

type Props = { children: React.ReactNode; active: string; compact?: boolean }

export function AppShell({ children, active, compact = false }: Props) {
  const { dict } = usePreferences()
  const [integrationsOpen, setIntegrationsOpen] = useState(false)
  const [performanceOpen, setPerformanceOpen] = useState(
    active === 'Analytics' || active === 'Revenus' || active === 'Performance',
  )
  const integrationsActive = active === 'Integrations' || active === 'WhatsApp'
  const performanceActive = active === 'Analytics' || active === 'Revenus' || active === 'Performance'

  return (
    <div className={`shell${compact ? ' shell-compact' : ''}`}>
      <aside className={compact ? 'shell-aside-compact' : undefined}>
        <Link href="/dashboard" className="brand" title={dict.brand}>
          <b>C</b>
          {!compact && (
            <>
              <strong>{dict.brand}</strong>
              <small>{dict.tagline}</small>
            </>
          )}
        </Link>
        {!compact && <div className="workspace">C&nbsp; {dict.workspace}</div>}
        <nav>
          {itemsBefore.map(([name, Icon, href]) => (
            <Link
              className={active === name ? 'active' : ''}
              href={href}
              key={name}
              title={(dict.nav as Record<string, string>)[name] || name}
            >
              <Icon size={17} />
              {!compact && <span>{(dict.nav as Record<string, string>)[name] || name}</span>}
            </Link>
          ))}

          <div className="sidebar-group">
            <button
              type="button"
              className="sidebar-group-trigger"
              onClick={() => setPerformanceOpen((v) => !v)}
              title="Performance"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 10px',
                border: 0,
                borderRadius: 8,
                color: performanceActive ? '#fff' : 'var(--sidebar-muted)',
                background: performanceActive ? 'var(--sidebar-hover)' : 'transparent',
                fontSize: 12,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <BarChart3 size={17} />
              {!compact && (
                <>
                  <span style={{ flex: 1 }}>Performance</span>
                  <ChevronDown
                    size={15}
                    style={{
                      transform: performanceOpen ? 'rotate(180deg)' : undefined,
                      transition: 'transform .15s',
                    }}
                  />
                </>
              )}
            </button>
            {!compact && performanceOpen && (
              <div className="sidebar-group-children">
                <Link className={active === 'Analytics' ? 'active' : ''} href="/analytics">
                  <LineChart size={15} />
                  <span>Analytics</span>
                </Link>
                <Link className={active === 'Revenus' ? 'active' : ''} href="/revenus">
                  <Wallet size={15} />
                  <span>Revenus</span>
                </Link>
              </div>
            )}
          </div>

          {itemsAfter.map(([name, Icon, href]) => (
            <Link
              className={active === name ? 'active' : ''}
              href={href}
              key={name}
              title={(dict.nav as Record<string, string>)[name] || name}
            >
              <Icon size={17} />
              {!compact && <span>{(dict.nav as Record<string, string>)[name] || name}</span>}
            </Link>
          ))}

          <div className="sidebar-group">
            <button
              type="button"
              className="sidebar-group-trigger"
              onClick={() => setIntegrationsOpen((value) => !value)}
              title="Intégrations"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 10px',
                border: 0,
                borderRadius: 8,
                color: integrationsActive ? '#fff' : 'var(--sidebar-muted)',
                background: integrationsActive ? 'var(--sidebar-hover)' : 'transparent',
                fontSize: 12,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <Plug size={17} />
              {!compact && (
                <>
                  <span style={{ flex: 1 }}>Intégrations</span>
                  <ChevronDown
                    size={15}
                    style={{
                      transform: integrationsOpen ? 'rotate(180deg)' : undefined,
                      transition: 'transform .15s',
                    }}
                  />
                </>
              )}
            </button>
            {!compact && integrationsOpen && (
              <div className="sidebar-group-children">
                <Link className={active === 'Integrations' ? 'active' : ''} href="/integrations">
                  <CreditCard size={15} />
                  <span>Solutions de paiement</span>
                </Link>
                <Link className={active === 'WhatsApp' ? 'active' : ''} href="/whatsapp">
                  <MessageSquare size={15} />
                  <span>WhatsApp</span>
                </Link>
              </div>
            )}
          </div>

          <Link className={active === 'Tutorial' ? 'active' : ''} href="/tutorial" title={dict.nav.Tutorial}>
            <BookOpen size={17} />
            {!compact && <span>{dict.nav.Tutorial}</span>}
          </Link>
        </nav>
        <Link
          href="/settings"
          className={active === 'Settings' ? 'settings active' : 'settings'}
          title={dict.nav.Settings}
        >
          <Settings2 size={17} />
          {!compact && <span>{dict.nav.Settings}</span>}
        </Link>
        <form action={signOut} className="logout-form">
          <button type="submit" className="logout" title={dict.nav.Logout}>
            <LogOut size={17} />
            {!compact && <span>{dict.nav.Logout}</span>}
          </button>
        </form>
      </aside>
      <main className={compact ? 'shell-main-compact' : undefined}>{children}</main>
    </div>
  )
}
