'use client'

import Link from 'next/link'
import {
  LayoutDashboard, Zap, Users, Send, Bot, MessageSquare, MousePointer2, BarChart3, Wallet, Globe2,
  Settings2, LogOut, Plug, BookOpen, Radio, CreditCard, ChevronDown,
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { usePreferences } from '@/components/preferences-provider'
import { useState } from 'react'

const items = [
  ['Dashboard', LayoutDashboard, '/dashboard'],
  ['Funnels', Zap, '/funnels'],
  ['Contacts', Users, '/contacts'],
  ['Campaigns', Send, '/campaigns'],
  ['Automations', Bot, '/automations'],
  ['Live Events', Radio, '/lives'],
  ['Links', MousePointer2, '/links'],
  ['Revenus', Wallet, '/revenus'],
  ['Analytics', BarChart3, '/analytics'],
  ['Domains', Globe2, '/domains'],
] as const

type Props = { children: React.ReactNode; active: string; compact?: boolean }

export function AppShell({ children, active, compact = false }: Props) {
  const { dict } = usePreferences()
  const [integrationsOpen, setIntegrationsOpen] = useState(false)

  return (
    <div className={`shell${compact ? ' shell-compact' : ''}`}>
      <aside className={compact ? 'shell-aside-compact' : undefined}>
        <Link href="/dashboard" className="brand" title={dict.brand}>
          <b>C</b>
          {!compact && <><strong>{dict.brand}</strong><small>{dict.tagline}</small></>}
        </Link>
        {!compact && <div className="workspace">C&nbsp; {dict.workspace}</div>}
        <nav>
          {items.map(([name, Icon, href]) => (
            <Link className={active === name ? 'active' : ''} href={href} key={name} title={(dict.nav as Record<string, string>)[name] || name}>
              <Icon size={17} />
              {!compact && <span>{(dict.nav as Record<string, string>)[name] || name}</span>}
            </Link>
          ))}

          <div className="sidebar-group">
            <button
              type="button"
              className={active === 'Integrations' || active === 'WhatsApp' ? 'active' : ''}
              onClick={() => setIntegrationsOpen((value) => !value)}
              title="Intégrations"
              style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer' }}
            >
              <Plug size={17} />
              {!compact && <><span style={{ flex: 1, textAlign: 'left' }}>Intégrations</span><ChevronDown size={15} style={{ transform: integrationsOpen ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} /></>}
            </button>
            {!compact && integrationsOpen && (
              <div style={{ marginLeft: 34, display: 'grid', gap: 2, marginTop: 2, marginBottom: 4 }}>
                <Link className={active === 'Integrations' ? 'active' : ''} href="/integrations" style={{ fontSize: 13 }}>
                  <CreditCard size={15} /><span>Solutions de paiement</span>
                </Link>
                <Link className={active === 'WhatsApp' ? 'active' : ''} href="/whatsapp" style={{ fontSize: 13 }}>
                  <MessageSquare size={15} /><span>WhatsApp</span>
                </Link>
              </div>
            )}
          </div>

          <Link className={active === 'Tutorial' ? 'active' : ''} href="/tutorial" title={dict.nav.Tutorial}>
            <BookOpen size={17} />
            {!compact && <span>{dict.nav.Tutorial}</span>}
          </Link>
        </nav>
        <Link href="/settings" className={active === 'Settings' ? 'settings active' : 'settings'} title={dict.nav.Settings}>
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
