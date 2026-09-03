'use client'

import Link from 'next/link'
import { ArrowLeft, Eye, Globe2, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Page = { id: string; name: string; slug: string; page_type: string; position: number; published_version_id: string | null }
type Version = { id: string; version_number: number; html: string; css: string; js: string; metadata: Record<string, unknown> }

export default function FunnelEditor({ params }: { params: Promise<{ id: string }> }) {
  const [funnelId, setFunnelId] = useState('')
  const [funnel, setFunnel] = useState<{ name: string; slug: string; status: string } | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [selected, setSelected] = useState<Page | null>(null)
  const [version, setVersion] = useState<Version | null>(null)
  const [name, setName] = useState('Home')
  const [slug, setSlug] = useState('home')
  const [html, setHtml] = useState('<main style="font-family:system-ui;max-width:900px;margin:80px auto;padding:24px"><h1>Your funnel starts here</h1><p>Edit this page or import your AI-generated HTML in the next step.</p><a href="#cta">Get started</a></main>')
  const [css, setCss] = useState('body{margin:0;background:#fff;color:#111827}a{font-weight:700}')
  const [js, setJs] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { params.then(p => setFunnelId(p.id)) }, [params])

  async function load() {
    if (!funnelId) return
    const supabase = createClient()
    const { data: f } = await supabase.from('funnels').select('name,slug,status').eq('id', funnelId).single()
    if (!f) return
    setFunnel(f)
    const { data: ps } = await supabase.from('funnel_pages').select('id,name,slug,page_type,position,published_version_id').eq('funnel_id', funnelId).order('position')
    const list = ps || []
    setPages(list)
    const first = selected ? list.find(p => p.id === selected.id) : list[0]
    if (first) await selectPage(first)
  }

  useEffect(() => { load() }, [funnelId])

  async function selectPage(page: Page) {
    setSelected(page); setName(page.name); setSlug(page.slug); setMessage('')
    const supabase = createClient()
    const { data: v } = await supabase.from('funnel_versions').select('id,version_number,html,css,js,metadata').eq('page_id', page.id).order('version_number', { ascending: false }).limit(1).maybeSingle()
    setVersion(v)
    if (v) { setHtml(v.html); setCss(v.css); setJs(v.js) }
    else { setHtml(''); setCss(''); setJs('') }
  }

  async function createPage() {
    if (!funnelId) return
    setBusy(true); setMessage('')
    const supabase = createClient()
    const clean = `page-${pages.length + 1}`
    const { data, error } = await supabase.from('funnel_pages').insert({ funnel_id: funnelId, name: `Page ${pages.length + 1}`, slug: clean, page_type: 'landing', position: pages.length }).select('id,name,slug,page_type,position,published_version_id').single()
    if (error) setMessage(error.message); else { setPages(p => [...p, data]); await selectPage(data) }
    setBusy(false)
  }

  async function saveVersion() {
    if (!selected) return
    setBusy(true); setMessage('')
    const supabase = createClient()
    const { error: pageError } = await supabase.from('funnel_pages').update({ name: name.trim(), slug: slug.trim() }).eq('id', selected.id)
    if (pageError) { setMessage(pageError.message); setBusy(false); return }
    const { data: latest } = await supabase.from('funnel_versions').select('version_number').eq('page_id', selected.id).order('version_number', { ascending: false }).limit(1).maybeSingle()
    const next = (latest?.version_number || 0) + 1
    const { data: v, error } = await supabase.from('funnel_versions').insert({ page_id: selected.id, version_number: next, html, css, js, metadata: { editor: 'conik' } }).select('id,version_number,html,css,js,metadata').single()
    if (error) setMessage(error.message); else { setVersion(v); setMessage(`Version ${next} saved.`); await load() }
    setBusy(false)
  }

  async function publish() {
    if (!selected || !version) return
    setBusy(true); setMessage('')
    const supabase = createClient()
    const { error } = await supabase.rpc('publish_funnel_page', { target_page: selected.id, target_version: version.id })
    if (error) setMessage(error.message)
    else {
      await supabase.from('funnels').update({ status: 'published' }).eq('id', funnelId)
      setMessage('Page published. JavaScript remains disabled in the safe preview/runtime until isolated execution is implemented.')
      await load()
    }
    setBusy(false)
  }

  const preview = useMemo(() => `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`, [html, css])

  if (!funnel) return <div className="page"><p>Loading funnel editor…</p></div>
  return <div className="page">
    <Link href={`/funnels/${funnelId}`} className="back"><ArrowLeft size={15}/>Funnel</Link>
    <div className="head"><div><small>FUNNEL EDITOR</small><h1>{funnel.name}</h1><p>/{funnel.slug} · {funnel.status}</p></div><div className="button-row"><a className="outline" href={`/funnels/${funnelId}/editor`}><Eye size={15}/>Editor</a>{funnel.status === 'published' && <a className="outline" href={`/${funnel.slug}`} target="_blank"><Globe2 size={15}/>Open funnel</a>}<button className="primary" onClick={saveVersion} disabled={busy || !selected}><Save size={15}/>{busy ? 'Saving…' : 'Save version'}</button><button className="primary" onClick={publish} disabled={busy || !version}><Globe2 size={15}/>Publish</button></div></div>
    {message && <div className="notice">{message}</div>}
    <div className="editor-grid">
      <aside className="panel"><div className="section-head"><h3>Pages</h3><button className="icon-button" onClick={createPage} disabled={busy}><Plus size={16}/></button></div>{pages.length === 0 ? <div className="empty"><b>No pages yet</b><span>Create your first landing page.</span></div> : pages.map(p => <button key={p.id} className={`page-item ${selected?.id === p.id ? 'active' : ''}`} onClick={() => selectPage(p)}><span>{p.name}</span><small>/{p.slug}</small></button>)}</aside>
      <section className="panel"><div className="section-head"><h3>Page settings</h3>{version && <span className="muted">Version {version.version_number}</span>}</div><div className="form-grid"><label className="form-label">Name<input className="form-input" value={name} onChange={e => setName(e.target.value)}/></label><label className="form-label">Slug<input className="form-input" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'-'))}/></label></div><label className="form-label">HTML<textarea className="code-input" value={html} onChange={e=>setHtml(e.target.value)}/></label><label className="form-label">CSS<textarea className="code-input" value={css} onChange={e=>setCss(e.target.value)}/></label><label className="form-label">JavaScript<textarea className="code-input" value={js} onChange={e=>setJs(e.target.value)} placeholder="Stored for the isolated runtime; not executed on the Conik app origin."/></label></section>
      <section className="panel"><div className="section-head"><h3>Safe preview</h3><span className="muted">Sandboxed</span></div><iframe title="Funnel preview" sandbox="" srcDoc={preview} className="preview-frame"/></section>
    </div>
  </div>
}
