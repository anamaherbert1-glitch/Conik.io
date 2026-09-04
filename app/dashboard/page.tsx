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

  return <AppShell active="Dashboard"><header><div><small>ESPACE DE TRAVAIL</small><h1>Bonjour.</h1><p className="muted">{organization.name}</p></div><span className="avatar">AH</span></header><section className="hero"><div><span className="live">● Espace de travail actif</span><h2>Transformez votre trafic en clients.</h2><p>Créez, hébergez et automatisez vos tunnels marketing depuis un seul centre de commande.</p></div><Link className="primary" href="/funnels/new"><Plus size={17}/>Créer un tunnel</Link></section><section className="stats"><Card icon={Users} t="Contacts" v={String(contactCount ?? 0)} n="Enregistrés dans votre CRM"/><Card icon={Zap} t="Tunnels" v={String(funnelCount ?? 0)} n="Créés dans l’espace de travail"/><Card icon={Activity} t="Visiteurs" v="—" n="Phase de suivi en attente"/><Card icon={CircleDollarSign} t="Chiffre d’affaires" v="—" n="Intégration des ventes en attente"/></section><section className="grid"><Panel title="Performance"><div className="empty"><BarChart3 size={28}/><b>Les statistiques réelles apparaîtront ici</b><span>Publiez un tunnel et connectez le suivi du trafic pour alimenter ce panneau.</span></div></Panel><Panel title="État de l’espace de travail"><div className="empty"><Zap size={28}/><b>Les fondations sont connectées</b><span>L’authentification, l’isolation de l’espace de travail et la persistance en base de données sont activées.</span></div></Panel></section></AppShell>
}
function Card({icon: Icon,t,v,n}: {icon: React.ElementType;t:string;v:string;n:string}) { return <div className="card"><Icon size={18}/><small>{t}</small><strong>{v}</strong><span>{n}</span></div> }
function Panel({title,children}: {title:string;children:React.ReactNode}) { return <div className="panel"><h3>{title}</h3>{children}</div> }
