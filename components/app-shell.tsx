'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Zap, Users, Send, Bot, MessageSquare, MousePointer2, BarChart3, Globe2,
  Settings2, LogOut, Plug, BookOpen, Radio, CreditCard, ChevronDown, Wallet, LineChart,
  Menu, X,
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { usePreferences } from '@/components/preferences-provider'
import { useEffect, useState } from 'react'

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
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [integrationsOpen, setIntegrationsOpen] = useState(false)
  const [performanceOpen, setPerformanceOpen] = useState(
    active === 'Analytics' || active === 'Revenus' || active === 'Performance',
  )
  const integrationsActive = active === 'Integrations' || active === 'WhatsApp'
  const performanceActive = active === 'Analytics' || active === 'Revenus' || active === 'Performance'

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className={`shell${compact ? ' shell-compact' : ''}${menuOpen ? ' shell-menu-open' : ''}`}>
      <div className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <Link href="/dashboard" className="mobile-brand" onClick={closeMenu}>
          <b>C</b>
          <strong>{dict.brand}</strong>
        </Link>
        <Link href="/settings" className="mobile-settings-btn" title={dict.nav.Settings} onClick={closeMenu}>
          <Settings2 size={20} />
        </Link>
      </div>

      <button
        type="button"
        className="mobile-nav-backdrop"
        aria-label="Fermer le menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />

      <aside className={`${compact ? 'shell-aside-compact' : ''} ${menuOpen ? 'aside-open' : ''}`.trim()}>
        <div className="aside-mobile-close">
          <span className="muted" style={{ color: 'var(--sidebar-muted)', fontSize: 12 }}>Menu</span>
          <button type="button" className="mobile-menu-btn" aria-label="Fermer" onClick={closeMenu}>
            <X size={20} />
          </button>
        </div>
        <Link href="/dashboard" className="brand" title={dict.brand} onClick={closeMenu}>
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
              onClick={closeMenu}
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
                <Link className={active === 'Analytics' ? 'active' : ''} href="/analytics" onClick={closeMenu}>
                  <LineChart size={15} />
                  <span>Analytics</span>
                </Link>
                <Link className={active === 'Revenus' ? 'active' : ''} href="/revenus" onClick={closeMenu}>
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
              onClick={closeMenu}
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
                <Link className={active === 'Integrations' ? 'active' : ''} href="/integrations" onClick={closeMenu}>
                  <CreditCard size={15} />
                  <span>Solutions de paiement</span>
                </Link>
                <Link className={active === 'WhatsApp' ? 'active' : ''} href="/whatsapp" onClick={closeMenu}>
                  <MessageSquare size={15} />
                  <span>WhatsApp</span>
                </Link>
              </div>
            )}
          </div>

          <Link className={active === 'Tutorial' ? 'active' : ''} href="/tutorial" title={dict.nav.Tutorial} onClick={closeMenu}>
            <BookOpen size={17} />
            {!compact && <span>{dict.nav.Tutorial}</span>}
          </Link>
        </nav>
        <Link
          href="/settings"
          className={active === 'Settings' ? 'settings active' : 'settings'}
          title={dict.nav.Settings}
          onClick={closeMenu}
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
