import Link from 'next/link'
import { LayoutDashboard, Zap, Users, Send, Bot, MessageSquare, MousePointer2, BarChart3, Globe2, Settings2 } from 'lucide-react'

const items = [
  ['Dashboard', LayoutDashboard, '/dashboard'], ['Funnels', Zap, '/funnels'], ['Contacts', Users, '/contacts'],
  ['Campaigns', Send, '/campaigns'], ['Automations', Bot, '/automations'], ['WhatsApp', MessageSquare, '/whatsapp'],
  ['Emails', Send, '/emails'], ['Links', MousePointer2, '/links'], ['Analytics', BarChart3, '/analytics'], ['Domains', Globe2, '/domains'],
] as const

export function AppShell({ children, active }: { children: React.ReactNode; active: string }) {
  return <div className="shell"><aside><Link href="/dashboard" className="brand"><b>C</b><strong>Conik.io</strong><small>Marketing OS</small></Link><div className="workspace">C&nbsp; Workspace</div><nav>{items.map(([name, Icon, href]) => <Link className={active === name ? 'active' : ''} href={href} key={name}><Icon size={17}/>{name}</Link>)}</nav><Link href="/settings" className={active === 'Settings' ? 'settings active' : 'settings'}><Settings2 size={17}/>Settings</Link></aside><main>{children}</main></div>
}
