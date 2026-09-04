import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { requireWorkspace } from '@/lib/auth/require-user'

export const dynamic='force-dynamic'
export default async function CampaignsPage(){const {supabase}=await requireWorkspace(); const {data,error}=await supabase.from('campaigns').select('*').order('created_at',{ascending:false}).limit(100); return <AppShell active="Campaigns"><header><div><small>CAMPAIGNS</small><h1>Campaigns</h1><p className="muted">Manage campaign definitions and their status.</p></div><Link className="primary" href="/campaigns/new">Create campaign</Link></header>{error&&<div className="error">Unable to load campaigns: {error.message}</div>}<section className="panel">{data?.length?<div className="funnel-table">{data.map((c:any)=><div className="funnel-row" key={c.id}><div><b>{c.name||'Untitled campaign'}</b><span>{c.channel||'Internal'} · {c.status||'draft'}</span></div><Link className="outline" href={`/campaigns/${c.id}`}>Open</Link></div>)}</div>:<div className="empty"><b>No campaigns yet</b><span>Create a campaign when you are ready to connect delivery channels.</span></div>}</section></AppShell>}
