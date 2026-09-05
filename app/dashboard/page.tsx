import Link from 'next/link'
import { Users, Zap, Activity, CircleDollarSign, BarChart3, Plus, FolderPlus } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { requireWorkspace } from '@/lib/auth/require-user'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const { supabase, organization } = await requireWorkspace()
  const since = new Date(Date.now() - 30 * 86400000).toISOString()
  const [{ count: funnelCount }, { count: contactCount }, { data: funnelRows }, { data: conversions }] = await Promise.all([
    supabase.from('funnels').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id),
    supabase.from('funnels').select('id').eq('organization_id', organization.id),
    supabase.from('conversions').select('amount,currency').eq('organization_id', organization.id).gte('created_at', since),
  ])
  const funnelIds = (funnelRows || []).map((row) => row.id)
  const { data: views } = funnelIds.length ? await supabase.from('page_views').select('visitor_id').in('funnel_id', funnelIds).gte('created_at', since) : { data: [] as { visitor_id: string | null }[] }
  const visitors = new Set((views || []).map((view) => view.visitor_id).filter(Boolean)).size
  const currencies = new Map<string, number>()
  for (const row of conversions || []) { const currency = String(row.currency || '').trim().toUpperCase(); currencies.set(currency || 'UNKNOWN', (currencies.get(currency || 'UNKNOWN') || 0) + Number(row.amount || 0)) }
  const entries = [...currencies.entries()]
  const revenue = entries.length === 0 ? '0' : entries.length > 1 ? `${entries.length} devises` : entries[0][0] === 'UNKNOWN' ? new Intl.NumberFormat('fr-FR').format(entries[0][1]) : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: entries[0][0] }).format(entries[0][1])

  return <AppShell active="Dashboard"><header><div><small>ESPACE DE TRAVAIL</small><h1>Bonjour.</h1><p className="muted">{organization.name}</p></div><span className="avatar">AH</span></header><section className="hero"><div><span className="live">● Espace de travail actif</span><h2>Transformez votre trafic en clients.</h2><p>Créez, hébergez et automatisez vos tunnels marketing depuis un seul centre de commande.</p></div><Link className="primary project-create" href="/funnels/new"><FolderPlus size={17}/>Créer un projet</Link></section><section className="stats"><Card icon={Users} t="Contacts" v={String(contactCount ?? 0)} n="Enregistrés dans votre CRM"/><Card icon={Zap} t="Tunnels" v={String(funnelCount ?? 0)} n="Créés dans l’espace de travail"/><Card icon={Activity} t="Visiteurs" v={String(visitors)} n="Visiteurs uniques · 30 derniers jours"/><Card icon={CircleDollarSign} t="Chiffre d’affaires" v={revenue} n="Conversions · 30 derniers jours"/></section><section className="grid"><Panel title="Performance"><div className="empty"><BarChart3 size={28}/><b>Analyse détaillée disponible</b><span>Consultez les statistiques de trafic, formulaires, conversions et activité dans Analytics.</span><Link className="outline" href="/analytics">Ouvrir Analytics</Link></div></Panel><Panel title="Démarrage rapide"><div className="empty"><FolderPlus size={28}/><b>Votre prochain projet commence ici</b><span>Créez un tunnel, publiez votre page puis connectez vos contacts et automatisations.</span><Link className="primary project-create" href="/funnels/new"><Plus size={16}/>Créer un projet</Link></div></Panel></section></AppShell>
}
function Card({icon: Icon,t,v,n}: {icon: React.ElementType;t:string;v:string;n:string}) { return <div className="card"><Icon size={18}/><small>{t}</small><strong>{v}</strong><span>{n}</span></div> }
function Panel({title,children}: {title:string;children:React.ReactNode}) { return <div className="panel"><h3>{title}</h3>{children}</div> }
