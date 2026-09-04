'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '@/components/app-shell'

type Day = { date:string; views:number; clicks:number; submissions:number; conversions:number }
type Analytics = { pageViews:number; visitors:number; clicks:number; submissions:number; leads:number; conversions:number; revenue:number; byDay:Day[] }

type Series = { key:keyof Pick<Day,'views'|'clicks'|'submissions'|'conversions'>; label:string }
const series:Series[] = [
  {key:'views',label:'Vues'},
  {key:'clicks',label:'Clics'},
  {key:'submissions',label:'Soumissions'},
  {key:'conversions',label:'Conversions'},
]

export default function AnalyticsPage(){
 const [days,setDays]=useState(30); const [data,setData]=useState<Analytics|null>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('')
 useEffect(()=>{let cancelled=false; setLoading(true); setError(''); fetch(`/api/analytics?days=${days}`).then(async r=>{if(!r.ok) throw new Error((await r.json()).error||'Impossible de charger les statistiques'); return r.json()}).then(j=>{if(!cancelled)setData(j)}).catch(e=>{if(!cancelled)setError(e.message)}).finally(()=>{if(!cancelled)setLoading(false)}); return()=>{cancelled=true}},[days])
 const conversionRate=useMemo(()=>data&&data.pageViews?((data.conversions/data.pageViews)*100):0,[data])
 return <AppShell active="Analytics"><header><div><small>STATISTIQUES</small><h1>Performance</h1><p className="muted">Événements réels enregistrés par votre espace de travail.</p></div><div className="button-row">{[7,30,90].map(d=><button key={d} className={days===d?'primary':'outline'} onClick={()=>setDays(d)}>{d} jours</button>)}<Link className="outline" href="/dashboard">Tableau de bord</Link></div></header>{error&&<div className="error">{error}</div>}{loading?<div className="panel">Chargement des statistiques…</div>:data&&<>
  <section className="stats"><Metric t="Pages vues" v={data.pageViews}/><Metric t="Visiteurs" v={data.visitors}/><Metric t="Clics" v={data.clicks}/><Metric t="Soumissions" v={data.submissions}/><Metric t="Conversions" v={data.conversions}/><Metric t="Taux de conversion" v={`${conversionRate.toFixed(1)}%`}/></section>
  <section className="panel" style={{marginTop:18}}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:18}}><div><h3 style={{margin:0}}>Trafic et conversions</h3><p className="muted" style={{margin:'5px 0 0'}}>Performance quotidienne sur la période sélectionnée.</p></div><strong>{data.revenue ? data.revenue.toLocaleString('fr-FR') : '0'} de chiffre d’affaires total</strong></div><AnalyticsChart data={data.byDay}/></section>
  <section className="panel" style={{marginTop:18}}><h3>Activité quotidienne</h3><div className="funnel-table">{data.byDay.slice().reverse().map(x=><div className="funnel-row" key={x.date}><b>{formatDate(x.date)}</b><span>{x.views} vues · {x.clicks} clics · {x.submissions} soumissions · {x.conversions} conversions</span></div>)}</div></section>
 </>}</AppShell>
}

function Metric({t,v}:{t:string;v:number|string}){return <div className="card"><small>{t}</small><strong>{typeof v==='number'?v.toLocaleString('fr-FR'):v}</strong></div>}

function formatDate(value:string){return new Date(`${value}T00:00:00`).toLocaleDateString('fr-FR',{month:'short',day:'numeric'})}

function AnalyticsChart({data}:{data:Day[]}){
 const width=900, height=330, pad={left:48,right:18,top:22,bottom:42}; const innerW=width-pad.left-pad.right, innerH=height-pad.top-pad.bottom
 const max=Math.max(1,...data.flatMap(d=>series.map(s=>Number(d[s.key]||0))))
 const points=(key:Series['key'])=>data.map((d,i)=>{const x=pad.left+(data.length<=1?innerW/2:(i/(data.length-1))*innerW); const y=pad.top+innerH-(Number(d[key]||0)/max)*innerH; return `${x},${y}`}).join(' ')
 const yTicks=[0,.25,.5,.75,1].map(p=>({y:pad.top+innerH-p*innerH,value:Math.round(max*p)}))
 const labels=data.filter((_,i)=>data.length<=7||i===0||i===data.length-1||i%Math.ceil(data.length/6)===0)
 return <div style={{overflowX:'auto'}}><svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="Graphique linéaire des statistiques" style={{minWidth:650,height:'auto',display:'block'}}>
   {yTicks.map(t=><g key={t.value}><line x1={pad.left} x2={width-pad.right} y1={t.y} y2={t.y} stroke="currentColor" opacity=".10"/><text x={pad.left-10} y={t.y+4} textAnchor="end" fontSize="11" fill="currentColor" opacity=".65">{t.value}</text></g>)}
   <line x1={pad.left} x2={width-pad.right} y1={pad.top+innerH} y2={pad.top+innerH} stroke="currentColor" opacity=".18"/>
   {series.map(s=><polyline key={s.key} points={points(s.key)} fill="none" stroke="currentColor" strokeWidth={s.key==='views'?3:2} opacity={s.key==='views'?1:.55} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.key==='conversions'?'6 5':undefined}/>) }
   {series.map(s=>data.map((d,i)=>{if(Number(d[s.key]||0)===0)return null; const x=pad.left+(data.length<=1?innerW/2:(i/(data.length-1))*innerW); const y=pad.top+innerH-(Number(d[s.key]||0)/max)*innerH; return <circle key={`${s.key}-${i}`} cx={x} cy={y} r="3.5" fill="currentColor" opacity={s.key==='views'?1:.65}><title>{formatDate(d.date)} — {s.label}: {d[s.key]}</title></circle>}))}
   {labels.map(d=>{const i=data.indexOf(d); const x=pad.left+(data.length<=1?innerW/2:(i/(data.length-1))*innerW); return <text key={d.date} x={x} y={height-14} textAnchor="middle" fontSize="11" fill="currentColor" opacity=".65">{formatDate(d.date)}</text>})}
 </svg><div style={{display:'flex',justifyContent:'center',gap:20,flexWrap:'wrap',fontSize:12,marginTop:6}}>{series.map(s=><span key={s.key} style={{display:'inline-flex',alignItems:'center',gap:6}}><i style={{display:'inline-block',width:22,borderTop:`${s.key==='views'?3:2}px ${s.key==='conversions'?'dashed':'solid'} currentColor`,opacity:s.key==='views'?1:.6}}/>{s.label}</span>)}</div></div>
}
