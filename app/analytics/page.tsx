'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'

type Analytics = { pageViews:number; visitors:number; clicks:number; submissions:number; leads:number; conversions:number; byDay:{date:string;views:number;clicks:number;submissions:number}[] }

export default function AnalyticsPage(){
 const [days,setDays]=useState(30); const [data,setData]=useState<Analytics|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('')
 useEffect(()=>{setLoading(true); fetch(`/api/analytics?days=${days}`).then(async r=>{if(!r.ok) throw new Error((await r.json()).error||'Unable to load analytics'); return r.json()}).then(setData).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[days])
 return <AppShell active="Analytics"><header><div><small>ANALYTICS</small><h1>Performance</h1><p className="muted">Real events recorded by your workspace.</p></div><div className="button-row">{[7,30,90].map(d=><button key={d} className={days===d?'primary':'outline'} onClick={()=>setDays(d)}>{d} days</button>)}<Link className="outline" href="/dashboard">Dashboard</Link></div></header>{error&&<div className="error">{error}</div>}{loading?<div className="panel">Loading analytics…</div>:data&&<><section className="stats"><Metric t="Page views" v={data.pageViews}/><Metric t="Visitors" v={data.visitors}/><Metric t="Clicks" v={data.clicks}/><Metric t="Submissions" v={data.submissions}/><Metric t="Leads" v={data.leads}/><Metric t="Conversions" v={data.conversions}/></section><section className="panel"><h3>Daily activity</h3><div className="funnel-table">{data.byDay.map(x=><div className="funnel-row" key={x.date}><b>{x.date}</b><span>{x.views} views · {x.clicks} clicks · {x.submissions} submissions</span></div>)}</div></section></>}</AppShell>
}
function Metric({t,v}:{t:string;v:number}){return <div className="card"><small>{t}</small><strong>{v.toLocaleString()}</strong></div>}
