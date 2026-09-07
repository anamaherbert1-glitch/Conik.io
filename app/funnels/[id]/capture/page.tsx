'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle2, UploadCloud } from 'lucide-react'
import { useEffect, useState } from 'react'

type Capture = { id:string; name:string; slug:string; capture_enabled:boolean; capture_delay_ms:number; capture_html:string; capture_css:string; capture_js:string }
type ButtonItem = { index:number; label:string; href:string }

function detectButtons(html:string):ButtonItem[]{
  if(typeof window==='undefined')return[]
  const doc=new DOMParser().parseFromString(html,'text/html')
  return Array.from(doc.querySelectorAll('a,button,input[type="button"],input[type="submit"]')).map((el,index)=>({index,label:(el.textContent||el.getAttribute('value')||'').trim().replace(/\s+/g,' ')||`Bouton ${index+1}`,href:el.getAttribute('href')||el.getAttribute('data-conik-redirect')||''}))
}
function applyButtonLinks(html:string,items:ButtonItem[]){
  if(typeof window==='undefined')return html
  const doc=new DOMParser().parseFromString(html,'text/html')
  const nodes=Array.from(doc.querySelectorAll('a,button,input[type="button"],input[type="submit"]'))
  items.forEach((item,index)=>{const el=nodes[index];const href=item.href.trim();if(!el||!href)return;if(el.tagName.toLowerCase()==='a')el.setAttribute('href',href);else{el.setAttribute('type','button');el.setAttribute('data-conik-redirect',href);el.setAttribute('onclick',`window.location.href=${JSON.stringify(href)}`)}})
  return doc.body.innerHTML
}

export default function CapturePage({ params }: { params: Promise<{ id:string }> }) {
  const [funnelId,setFunnelId]=useState(''); const [capture,setCapture]=useState<Capture|null>(null); const [enabled,setEnabled]=useState(false); const [delay,setDelay]=useState(5); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false); const [buttons,setButtons]=useState<ButtonItem[]>([])
  useEffect(()=>{params.then(p=>setFunnelId(p.id))},[params])
  useEffect(()=>{if(!funnelId)return;(async()=>{const r=await fetch(`/api/funnels/capture-page?funnelId=${encodeURIComponent(funnelId)}`);const j=await r.json();if(!r.ok){setMessage(j.error||'Chargement impossible.');return}setCapture(j.capture);setEnabled(j.capture.capture_enabled);setDelay(Math.max(1,Math.round(j.capture.capture_delay_ms/1000)));setButtons(detectButtons(j.capture.capture_html||''))})()},[funnelId])
  function updateButton(index:number,href:string){setButtons(current=>current.map((b,i)=>i===index?{...b,href}:b))}
  async function save(file?:File){if(!funnelId)return;setBusy(true);setMessage('');try{let sourceHtml=capture?.capture_html||'';let activeButtons=buttons;if(file){sourceHtml=await file.text();activeButtons=detectButtons(sourceHtml);setButtons(activeButtons)}else{activeButtons=buttons.length?buttons:detectButtons(sourceHtml)}const finalHtml=applyButtonLinks(sourceHtml,activeButtons);const body=new FormData();body.append('funnelId',funnelId);body.append('enabled',String(enabled));body.append('delayMs',String(Math.min(60,Math.max(1,Number(delay)||1))*1000));if(finalHtml.trim())body.append('file',new File([finalHtml],'capture.html',{type:'text/html'}));const r=await fetch('/api/funnels/capture-page',{method:'POST',body});const j=await r.json();if(!r.ok)throw new Error(j.error||'Enregistrement impossible.');setCapture(j.capture);setButtons(detectButtons(j.capture.capture_html||''));setMessage(file?'Page HTML de capture importée. Les boutons ont été détectés et peuvent recevoir chacun une redirection.':'Paramètres de capture enregistrés.')}catch(e){setMessage(e instanceof Error?e.message:'Enregistrement impossible.')}finally{setBusy(false)}}
  const preview=capture?.capture_html?`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${capture.capture_css||''}</style></head><body>${capture.capture_html}<script>${capture.capture_js||''}<\\/script></body></html>`:''
  return <div className="page"><Link href={`/funnels/${funnelId}`} className="back"><ArrowLeft size={15}/>Tunnel</Link><div className="head"><div><small>PAGE DE CAPTURE</small><h1>{capture?.name||'Capture'}</h1><p>La page de capture s’affiche uniquement sur la toute première page du tunnel.</p></div><button className="primary" onClick={()=>void save()} disabled={busy||!capture}><CheckCircle2 size={16}/>{busy?'Enregistrement…':'Enregistrer'}</button></div>{message&&<div className="notice">{message}</div>}
    <div className="panel" style={{marginBottom:16}}><div className="section-head"><div><h3>Configuration</h3><span className="muted">Importez votre propre design HTML.</span></div></div><div className="form-grid"><label className="field"><span>Afficher la capture</span><select value={enabled?'on':'off'} onChange={e=>setEnabled(e.target.value==='on')}><option value="on">Oui</option><option value="off">Non</option></select></label><label className="field"><span>Délai avant affichage (secondes)</span><input type="number" min="1" max="60" value={delay} onChange={e=>setDelay(Math.max(1,Math.min(60,Number(e.target.value)||1)))}/></label></div><div className="capture-import"><label className="outline upload-label import-button"><UploadCloud size={16}/>Importer le fichier HTML de capture<input type="file" accept=".html,.htm,text/html" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void save(f);e.currentTarget.value='' }}/></label><span className="muted">Le HTML est analysé automatiquement pour trouver les boutons et liens.</span></div></div>
    <div className="panel" style={{marginBottom:16}}><div className="section-head"><h3>Redirections des boutons</h3><span className="muted">{buttons.length} bouton(s)/lien(s)</span></div>{buttons.length?buttons.map((b,i)=><div key={i} style={{display:'grid',gridTemplateColumns:'minmax(180px,1fr) minmax(260px,2fr)',gap:12,alignItems:'center',padding:'12px 0',borderBottom:'1px solid #eee'}}><div><b>{i+1}. {b.label}</b><small style={{display:'block',opacity:.65}}>Élément HTML #{i+1}</small></div><input value={b.href} placeholder="https://exemple.com/page" onChange={e=>updateButton(i,e.target.value)}/></div>):<p className="muted">Importez un fichier HTML contenant au moins un bouton ou un lien.</p>} {buttons.length>0&&<div style={{marginTop:14}}><button className="primary" onClick={()=>void save()} disabled={busy}>Enregistrer les redirections</button></div>}</div>
    {capture?.capture_html&&<div className="panel"><div className="section-head"><h3>Aperçu</h3><span className="muted">Votre design importé</span></div><iframe title="Aperçu page de capture" sandbox="allow-scripts allow-forms" srcDoc={preview} style={{width:'100%',height:500,border:'1px solid #e5e7eb',borderRadius:12,background:'#fff'}}/></div>}
  </div>
}