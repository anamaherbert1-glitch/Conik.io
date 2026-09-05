import Link from 'next/link'
import { LayoutDashboard, Zap, Users, Send, Bot, MessageSquare, MousePointer2, BarChart3, Globe2, Settings2, LogOut } from 'lucide-react'
import { signOut } from '@/app/actions/auth'

const items = [
  ['Dashboard', LayoutDashboard, '/dashboard', 'Tableau de bord'], ['Funnels', Zap, '/funnels', 'Tunnels'], ['Contacts', Users, '/contacts', 'Contacts'],
  ['Campaigns', Send, '/campaigns', 'Campagnes'], ['Automations', Bot, '/automations', 'Automatisations'], ['WhatsApp', MessageSquare, '/whatsapp', 'WhatsApp'],
  ['Links', MousePointer2, '/links', 'Liens'], ['Analytics', BarChart3, '/analytics', 'Statistiques'], ['Domains', Globe2, '/domains', 'Domaines'],
] as const

export function AppShell({ children, active }: { children: React.ReactNode; active: string }) {
  return <div className="shell"><aside><Link href="/dashboard" className="brand"><b>C</b><strong>Conik.io</strong><small>Marketing OS</small></Link><div className="workspace">C&nbsp; Espace de travail</div><nav>{items.map(([name, Icon, href, label]) => <Link className={active === name ? 'active' : ''} href={href} key={name}><Icon size={17}/>{label}</Link>)}</nav><Link href="/settings" className={active === 'Settings' ? 'settings active' : 'settings'}><Settings2 size={17}/>Paramètres</Link><form action={signOut} className="logout-form"><button type="submit" className="logout"><LogOut size={17}/>Déconnexion</button></form></aside><main>{children}</main></div>
}
