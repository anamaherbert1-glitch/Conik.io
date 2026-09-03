import Link from 'next/link'
import { Users, Zap, Activity, CircleDollarSign, BarChart3, Plus } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { requireWorkspace } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const { supabase, organization } = await requireWorkspace()

  const [{ count: funnelCount }, { count: contactCount }] = await Promise.all([
    supabase.from('funnels').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id),
  ])

  return <AppShell active="Dashboard"><header><div><small>WORKSPACE</small><h1>Good afternoon.</h1><p className="muted">{organization.name}</p></div><span className="avatar">AH</span></header><section className="hero"><div><span className="live">● Live workspace</span><h2>Turn traffic into customers.</h2><p>Build, host and automate your marketing funnels from one command center.</p></div><Link className="primary" href="/funnels/new"><Plus size={17}/>Create funnel</Link></section><section className="stats"><Card icon={Users} t="Contacts" v={String(contactCount ?? 0)} n="Stored in your CRM"/><Card icon={Zap} t="Funnels" v={String(funnelCount ?? 0)} n="Created in workspace"/><Card icon={Activity} t="Visitors" v="—" n="Tracking phase pending"/><Card icon={CircleDollarSign} t="Revenue" v="—" n="Sales integration pending"/></section><section className="grid"><Panel title="Performance"><div className="empty"><BarChart3 size={28}/><b>Real analytics will appear here</b><span>Publish a funnel and connect traffic tracking to populate this panel.</span></div></Panel><Panel title="Workspace status"><div className="empty"><Zap size={28}/><b>Foundation is connected</b><span>Authentication, workspace isolation and database persistence are enabled.</span></div></Panel></section></AppShell>
}
function Card({icon: Icon,t,v,n}: {icon: React.ElementType;t:string;v:string;n:string}) { return <div className="card"><Icon size={18}/><small>{t}</small><strong>{v}</strong><span>{n}</span></div> }
function Panel({title,children}: {title:string;children:React.ReactNode}) { return <div className="panel"><h3>{title}</h3>{children}</div> }
