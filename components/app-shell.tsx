'use client'

import Link from 'next/link'
import {
  LayoutDashboard,
  Zap,
  Users,
  Send,
  Bot,
  MessageSquare,
  MousePointer2,
  BarChart3,
  Wallet,
  Globe2,
  Settings2,
  LogOut,
  Plug,
  BookOpen,
  Radio,
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { usePreferences } from '@/components/preferences-provider'

const items = [
  ['Dashboard', LayoutDashboard, '/dashboard'],
  ['Funnels', Zap, '/funnels'],
  ['Contacts', Users, '/contacts'],
  ['Campaigns', Send, '/campaigns'],
  ['Automations', Bot, '/automations'],
  ['Live Events', Radio, '/lives'],
  ['WhatsApp', MessageSquare, '/whatsapp'],
  ['Links', MousePointer2, '/links'],
  ['Revenus', Wallet, '/revenus'],
  ['Analytics', BarChart3, '/analytics'],
  ['Domains', Globe2, '/domains'],
  ['Integrations', Plug, '/integrations'],
  ['Tutorial', BookOpen, '/tutorial'],
] as const

type Props = {
  children: React.ReactNode
  active: string
  compact?: boolean
}

export function AppShell({ children, active, compact = false }: Props) {
  const { dict } = usePreferences()

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
          {items.map(([name, Icon, href]) => (
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
