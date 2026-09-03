import Link from 'next/link'
import { Plus, UploadCloud, Sparkles, ExternalLink } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'

export const dynamic = 'force-dynamic'

export default async function FunnelsPage() {
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims?.claims) redirect('/login')
  const { data: membership } = await supabase.from('organization_members').select('organization_id').eq('user_id', claims.claims.sub).order('created_at').limit(1).maybeSingle()
  if (!membership) redirect('/onboarding')
  const { data: funnels, error } = await supabase.from('funnels').select('id,name,slug,status,source,created_at').eq('organization_id', membership.organization_id).order('created_at', { ascending: false })

  return <AppShell active="Funnels">
    <header><div><small>FUNNELS</small><h1>Your funnels</h1><p className="muted">Host AI-generated and imported funnels.</p></div><Link className="primary" href="/funnels/new"><Plus size={17}/>New funnel</Link></header>
    {error && <div className="error">Unable to load funnels: {error.message}</div>}
    <div className="choices">
      <div className="choice"><div className="ico"><UploadCloud/></div><h2>Import a funnel</h2><p>Upload a ZIP containing HTML, CSS, JavaScript and assets. Validation and isolation happen before publication.</p><Link className="outline" href="/funnels/new?mode=import"><UploadCloud size={15}/>Choose ZIP</Link></div>
      <div className="choice"><div className="ico"><Sparkles/></div><h2>Generate with AI</h2><p>Describe your offer, audience and conversion goal. The generator will use the same funnel model.</p><Link className="outline" href="/funnels/new?mode=ai"><Sparkles size={15}/>Start with AI</Link></div>
    </div>
    <section className="panel funnel-list"><div className="section-head"><h3>Workspace funnels</h3><span>{funnels?.length ?? 0} total</span></div>
      {funnels && funnels.length > 0 ? <div className="funnel-table">{funnels.map((funnel) => <div className="funnel-row" key={funnel.id}><div><b>{funnel.name}</b><span>/{funnel.slug} · {funnel.source}</span></div><span className={`status ${funnel.status}`}>{funnel.status}</span><Link className="outline" href={`/funnels/${funnel.id}`}>Open <ExternalLink size={14}/></Link></div>)}</div> : <div className="emptybox"><b>No funnels yet</b><p>Create your first funnel above. It will be persisted in your workspace.</p></div>}
    </section>
  </AppShell>
}
