import Link from 'next/link'
import { ArrowLeft, Globe2, Pencil, Trash2 } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FunnelDeleteButton } from '@/components/funnel-delete-button'

export const dynamic = 'force-dynamic'

const STATUS_FR: Record<string, string> = { draft: 'brouillon', published: 'publié', archived: 'archivé' }
const SOURCE_FR: Record<string, string> = { imported: 'importé', ai_generated: 'généré par IA', manual: 'manuel' }

export default async function FunnelDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims) redirect('/login')
  const { data: funnel, error: funnelError } = await supabase.from('funnels').select('id,name,slug,status,source,created_at').eq('id', id).single()
  if (funnelError || !funnel) notFound()
  const { data: pages, error: pagesError } = await supabase.from('funnel_pages').select('id,name,slug,page_type,published_version_id,position').eq('funnel_id', id).order('position')
  if (pagesError) return <div className="page"><p className="error">Impossible de charger les pages du tunnel.</p></div>

  return <div className="page">
    <Link href="/funnels" className="back"><ArrowLeft size={15}/>Tunnels</Link>
    <div className="head">
      <div><small>TUNNEL</small><h1>{funnel.name}</h1><p>/{funnel.slug} · {STATUS_FR[funnel.status] ?? funnel.status} · source : {SOURCE_FR[funnel.source] ?? funnel.source}</p></div>
      <div className="button-row"><Link className="outline" href={`/funnels/${id}/editor`}><Pencil size={15}/>Ouvrir l’éditeur</Link>{funnel.status === 'published' && <a className="outline" href={`/${funnel.slug}`} target="_blank" rel="noreferrer"><Globe2 size={15}/>Voir le tunnel public</a>}<FunnelDeleteButton funnelId={id}/></div>
    </div>
    <div className="panel"><div className="section-head"><h3>Pages</h3><span className="muted">{pages?.length || 0} page(s)</span></div>{pages?.length ? <div className="funnel-table">{pages.map(page => <div className="funnel-row" key={page.id}><div><b>{page.name}</b><span>/{page.slug} · {page.page_type}</span></div><span className={`status ${page.published_version_id ? 'published' : 'draft'}`}>{page.published_version_id ? 'Publiée' : 'Brouillon'}</span><div className="button-row"><Link className="outline" href={`/funnels/${id}/editor`}>Modifier</Link>{page.published_version_id && <a className="outline" href={`/${funnel.slug}/${page.slug}`} target="_blank" rel="noreferrer"><Globe2 size={14}/>Ouvrir</a>}</div></div>)}</div> : <div className="empty"><b>Aucune page pour le moment</b><span>Ouvrez l’éditeur pour créer votre première landing page et enregistrer des versions.</span><Link className="primary" href={`/funnels/${id}/editor`}>Créer la première page</Link></div>}</div>
  </div>
}
