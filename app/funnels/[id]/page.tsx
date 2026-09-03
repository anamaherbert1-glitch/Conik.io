import Link from 'next/link'
import { ArrowLeft, Globe2, Pencil, Trash2 } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FunnelDeleteButton } from '@/components/funnel-delete-button'

export const dynamic = 'force-dynamic'

export default async function FunnelDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims) redirect('/login')
  const { data: funnel, error: funnelError } = await supabase.from('funnels').select('id,name,slug,status,source,created_at').eq('id', id).single()
  if (funnelError || !funnel) notFound()
  const { data: pages, error: pagesError } = await supabase.from('funnel_pages').select('id,name,slug,page_type,published_version_id,position').eq('funnel_id', id).order('position')
  if (pagesError) return <div className="page"><p className="error">Unable to load funnel pages.</p></div>

  return <div className="page">
    <Link href="/funnels" className="back"><ArrowLeft size={15}/>Funnels</Link>
    <div className="head">
      <div><small>FUNNEL</small><h1>{funnel.name}</h1><p>/{funnel.slug} · {funnel.status} · source: {funnel.source}</p></div>
      <div className="button-row"><Link className="outline" href={`/funnels/${id}/editor`}><Pencil size={15}/>Open editor</Link>{funnel.status === 'published' && <a className="outline" href={`/${funnel.slug}`} target="_blank" rel="noreferrer"><Globe2 size={15}/>Open public funnel</a>}<FunnelDeleteButton funnelId={id}/></div>
    </div>
    <div className="panel"><div className="section-head"><h3>Pages</h3><span className="muted">{pages?.length || 0} page(s)</span></div>{pages?.length ? <div className="funnel-table">{pages.map(page => <div className="funnel-row" key={page.id}><div><b>{page.name}</b><span>/{page.slug} · {page.page_type}</span></div><span className={`status ${page.published_version_id ? 'published' : 'draft'}`}>{page.published_version_id ? 'Published' : 'Draft'}</span><div className="button-row"><Link className="outline" href={`/funnels/${id}/editor`}>Edit</Link>{page.published_version_id && <a className="outline" href={`/${funnel.slug}/${page.slug}`} target="_blank" rel="noreferrer"><Globe2 size={14}/>Open</a>}</div></div>)}</div> : <div className="empty"><b>No pages yet</b><span>Open the editor to create your first landing page and save versions.</span><Link className="primary" href={`/funnels/${id}/editor`}>Create first page</Link></div>}</div>
  </div>
}
