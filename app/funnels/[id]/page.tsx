import Link from 'next/link'
import { ArrowLeft, Globe2, Settings2 } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function FunnelDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims) redirect('/login')
  const { data: funnel } = await supabase.from('funnels').select('id,name,slug,status,source,created_at').eq('id', id).single()
  if (!funnel) notFound()
  return <div className="page"><Link href="/funnels" className="back"><ArrowLeft size={15}/>Funnels</Link><div className="head"><div><small>FUNNEL</small><h1>{funnel.name}</h1><p>/{funnel.slug} · {funnel.status} · source: {funnel.source}</p></div><div className="button-row"><button className="outline" disabled><Globe2 size={15}/>Publish — next phase</button><button className="outline" disabled><Settings2 size={15}/>Settings</button></div></div><div className="panel"><h3>Funnel workspace</h3><div className="empty"><b>Page builder runtime is next</b><span>This funnel is persisted in Supabase. The next phase adds pages, versions, assets, secure rendering and publishing.</span></div></div></div>
}
