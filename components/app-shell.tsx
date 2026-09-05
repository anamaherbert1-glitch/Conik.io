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
  Globe2,
  Settings2,
  LogOut,
  Plug,
} from 'lucide-react'
import { signOut } from '@/app/actions/auth'
import { usePreferences } from '@/components/preferences-provider'

const items = [
  ['Dashboard', LayoutDashboard, '/dashboard'],
  ['Funnels', Zap, '/funnels'],
  ['Contacts', Users, '/contacts'],
  ['Campaigns', Send, '/campaigns'],
  ['Automations', Bot, '/automations'],
  ['WhatsApp', MessageSquare, '/whatsapp'],
  ['Links', MousePointer2, '/links'],
  ['Analytics', BarChart3, '/analytics'],
  ['Domains', Globe2, '/domains'],
  ['Integrations', Plug, '/integrations'],
] as const

export function AppShell({ children, active }: { children: React.ReactNode; active: string }) {
  const { dict } = usePreferences()

  return (
    <div className="shell">
      <aside>
        <Link href="/dashboard" className="brand">
          <b>C</b>
          <strong>{dict.brand}</strong>
          <small>{dict.tagline}</small>
        </Link>
        <div className="workspace">C&nbsp; {dict.workspace}</div>
        <nav>
          {items.map(([name, Icon, href]) => (
            <Link className={active === name ? 'active' : ''} href={href} key={name}>
              <Icon size={17} />
              {dict.nav[name]}
            </Link>
          ))}
        </nav>
        <Link href="/settings" className={active === 'Settings' ? 'settings active' : 'settings'}>
          <Settings2 size={17} />
          {dict.nav.Settings}
        </Link>
        <form action={signOut} className="logout-form">
          <button type="submit" className="logout">
            <LogOut size={17} />
            {dict.nav.Logout}
          </button>
        </form>
      </aside>
      <main>{children}</main>
    </div>
  )
}
