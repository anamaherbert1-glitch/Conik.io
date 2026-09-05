import Link from 'next/link'
import { Plus, UploadCloud, ExternalLink } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'

export const dynamic = 'force-dynamic'

const STATUS_FR: Record<string, string> = { draft: 'brouillon', published: 'publié', archived: 'archivé' }
const SOURCE_FR: Record<string, string> = { imported: 'importé', manual: 'manuel', ai_generated: 'anciennement généré par IA' }

export default async function FunnelsPage() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims) redirect('/login')
  const { data: membership } = await supabase.from('organization_members').select('organization_id').eq('user_id', claims.claims.sub).order('created_at').limit(1).maybeSingle()
  if (!membership) redirect('/onboarding')
  const { data: funnels, error } = await supabase.from('funnels').select('id,name,slug,status,source,created_at').eq('organization_id', membership.organization_id).order('created_at', { ascending: false })

  return <AppShell active="Funnels">
    <header><div><small>TUNNELS</small><h1>Vos tunnels</h1><p className="muted">Créez vos tunnels manuellement ou importez un site existant.</p></div><Link className="primary" href="/funnels/new"><Plus size={17}/>Nouveau tunnel</Link></header>
    {error && <div className="error">Impossible de charger les tunnels : {error.message}</div>}
    <div className="choices">
      <div className="choice"><div className="ico"><Plus/></div><h2>Créer un tunnel</h2><p>Partez d’un tunnel vide puis construisez et publiez vos pages depuis l’éditeur Conik.</p><Link className="outline" href="/funnels/new"><Plus size={15}/>Créer un tunnel</Link></div>
      <div className="choice"><div className="ico"><UploadCloud/></div><h2>Importer un tunnel</h2><p>Téléversez un ZIP contenant HTML, CSS et ressources. Conik valide, nettoie et héberge le contenu avant publication.</p><Link className="outline" href="/funnels/new?mode=import"><UploadCloud size={15}/>Choisir un ZIP</Link></div>
    </div>
    <section className="panel funnel-list"><div className="section-head"><h3>Tunnels de l’espace de travail</h3><span>{funnels?.length ?? 0} au total</span></div>
      {funnels && funnels.length > 0 ? <div className="funnel-table">{funnels.map((funnel) => <div className="funnel-row" key={funnel.id}><div><b>{funnel.name}</b><span>/{funnel.slug} · {SOURCE_FR[funnel.source] ?? funnel.source}</span></div><span className={`status ${funnel.status}`}>{STATUS_FR[funnel.status] ?? funnel.status}</span>{funnel.status === 'published' && <a className="outline" href={`/${funnel.slug}`} target="_blank" rel="noopener noreferrer">Voir en ligne <ExternalLink size={14}/></a>}<Link className="outline" href={`/funnels/${funnel.id}`}>Ouvrir <ExternalLink size={14}/></Link></div>)}</div> : <div className="emptybox"><b>Aucun tunnel pour le moment</b><p>Créez votre premier tunnel ci-dessus. Il sera enregistré dans votre espace de travail.</p></div>}
    </section>
  </AppShell>
}
