'use client'

import Link from 'next/link'
import { ArrowLeft, Eye, Globe2, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Page = { id: string; name: string; slug: string; page_type: string; position: number; published_version_id: string | null }
type Version = { id: string; version_number: number; html: string; css: string; js: string; metadata: Record<string, unknown> }

function cleanSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

export default function FunnelEditor({ params }: { params: Promise<{ id: string }> }) {
  const [funnelId, setFunnelId] = useState('')
  const [funnel, setFunnel] = useState<{ name: string; slug: string; status: string } | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [selected, setSelected] = useState<Page | null>(null)
  const [version, setVersion] = useState<Version | null>(null)
  const [name, setName] = useState('Home')
  const [slug, setSlug] = useState('home')
  const [html, setHtml] = useState('<main style="font-family:system-ui;max-width:900px;margin:80px auto;padding:24px"><h1>Votre tunnel commence ici</h1><p>Modifiez cette page ou importez votre HTML généré par IA à l’étape suivante.</p><a href="#cta">Commencer</a></main>')
  const [css, setCss] = useState('body{margin:0;background:#fff;color:#111827}a{font-weight:700}')
  const [js, setJs] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { params.then(p => setFunnelId(p.id)) }, [params])

  async function load() {
    if (!funnelId) return
    const supabase = createClient()
    const { data: f, error: funnelError } = await supabase.from('funnels').select('name,slug,status').eq('id', funnelId).single()
    if (funnelError || !f) { setMessage('Tunnel introuvable ou accès refusé.'); return }
    setFunnel(f)
    const { data: ps, error: pagesError } = await supabase.from('funnel_pages').select('id,name,slug,page_type,position,published_version_id').eq('funnel_id', funnelId).order('position')
    if (pagesError) { setMessage(pagesError.message); return }
    const list = ps || []
    setPages(list)
    if (list.length === 0) { setSelected(null); return }
    const currentId = selected?.id
    const first = (currentId && list.find(p => p.id === currentId)) || list[0]
    await selectPage(first)
  }

  useEffect(() => { load() }, [funnelId])

  async function selectPage(page: Page) {
    setSelected(page); setName(page.name); setSlug(page.slug); setMessage('')
    const supabase = createClient()
    const { data: v, error } = await supabase.from('funnel_versions').select('id,version_number,html,css,js,metadata').eq('page_id', page.id).order('version_number', { ascending: false }).limit(1).maybeSingle()
    if (error) { setMessage(error.message); return }
    setVersion(v)
    if (v) { setHtml(v.html); setCss(v.css); setJs(v.js) }
    else { setHtml(''); setCss(''); setJs('') }
  }

  async function createPage() {
    if (!funnelId) return
    setBusy(true); setMessage('')
    const supabase = createClient()
    const base = `page-${pages.length + 1}`
    let clean = base
    let suffix = 2
    while (pages.some(p => p.slug === clean)) { clean = `${base}-${suffix++}` }
    const { data, error } = await supabase.from('funnel_pages').insert({ funnel_id: funnelId, name: `Page ${pages.length + 1}`, title: `Page ${pages.length + 1}`, slug: clean, page_type: 'landing', position: pages.length, html_content: '' }).select('id,name,slug,page_type,position,published_version_id').single()
    if (error) setMessage(error.message)
    else { setPages(p => [...p, data]); await selectPage(data) }
    setBusy(false)
  }

  async function saveVersion() {
    if (!selected) return
    const cleanName = name.trim()
    const clean = cleanSlug(slug)
    if (cleanName.length < 1 || !clean) { setMessage('Le nom et l’identifiant (slug) de la page sont obligatoires.'); return }
    if (pages.some(p => p.id !== selected.id && p.slug === clean)) { setMessage('Cet identifiant de page est déjà utilisé dans ce tunnel.'); return }
    setBusy(true); setMessage('')
    const supabase = createClient()
    const { error: pageError } = await supabase.from('funnel_pages').update({ name: cleanName, title: cleanName, slug: clean, html_content: html }).eq('id', selected.id)
    if (pageError) { setMessage(pageError.message); setBusy(false); return }
    const { data: latest, error: latestError } = await supabase.from('funnel_versions').select('version_number').eq('page_id', selected.id).order('version_number', { ascending: false }).limit(1).maybeSingle()
    if (latestError) { setMessage(latestError.message); setBusy(false); return }
    const next = (latest?.version_number || 0) + 1
    const { data: v, error } = await supabase.from('funnel_versions').insert({ page_id: selected.id, version_number: next, html, css, js, metadata: { editor: 'conik' } }).select('id,version_number,html,css,js,metadata').single()
    if (error) setMessage(error.message)
    else { setVersion(v); setSelected(p => p ? { ...p, name: cleanName, slug: clean } : p); setPages(ps => ps.map(p => p.id === selected.id ? { ...p, name: cleanName, slug: clean } : p)); setMessage(`Version ${next} enregistrée.`) }
    setBusy(false)
  }

  async function publish() {
    if (!selected || !version) return
    setBusy(true); setMessage('')
    const supabase = createClient()
    const { error } = await supabase.rpc('publish_funnel_page', { target_page: selected.id, target_version: version.id })
    if (error) setMessage(error.message)
    else { setFunnel(f => f ? { ...f, status: 'published' } : f); setPages(ps => ps.map(p => p.id === selected.id ? { ...p, published_version_id: version.id } : p)); setSelected(p => p ? { ...p, published_version_id: version.id } : p); setMessage('Page publiée avec succès.') }
    setBusy(false)
  }

  async function deletePage() {
    if (!selected) return
    if (pages.length <= 1) { setMessage('Un tunnel doit conserver au moins une page.'); return }
    if (!window.confirm(`Supprimer « ${selected.name} » ? Ses versions seront définitivement supprimées.`)) return
    setBusy(true); setMessage('')
    const supabase = createClient()
    const { error } = await supabase.from('funnel_pages').delete().eq('id', selected.id)
    if (error) setMessage(error.message)
    else { const remaining = pages.filter(p => p.id !== selected.id); setPages(remaining); setSelected(null); setVersion(null); await selectPage(remaining[0]); setMessage('Page supprimée.') }
    setBusy(false)
  }

  const preview = useMemo(() => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html}</body></html>`, [html, css])

  if (!funnel) return <div className="page"><p>{message || 'Chargement de l’éditeur de tunnel…'}</p></div>
  return <div className="page">
    <Link href={`/funnels/${funnelId}`} className="back"><ArrowLeft size={15}/>Tunnel</Link>
    <div className="head"><div><small>ÉDITEUR DE TUNNEL</small><h1>{funnel.name}</h1><p>/{funnel.slug} · {funnel.status}</p></div><div className="button-row"><a className="outline" href={`/funnels/${funnelId}/editor`}><Eye size={15}/>Éditeur</a>{funnel.status === 'published' && <a className="outline" href={`/${funnel.slug}`} target="_blank" rel="noreferrer"><Globe2 size={15}/>Ouvrir le tunnel</a>}<button className="primary" onClick={saveVersion} disabled={busy || !selected}><Save size={15}/>{busy ? 'Enregistrement…' : 'Enregistrer la version'}</button><button className="primary" onClick={publish} disabled={busy || !version}><Globe2 size={15}/>Publier</button></div></div>
    {message && <div className="notice">{message}</div>}
    <div className="editor-grid">
      <aside className="panel"><div className="section-head"><h3>Pages</h3><button className="icon-button" onClick={createPage} disabled={busy} title="Ajouter une page"><Plus size={16}/></button></div>{pages.length === 0 ? <div className="empty"><b>Aucune page pour le moment</b><span>Créez votre première landing page.</span></div> : pages.map(p => <button key={p.id} className={`page-item ${selected?.id === p.id ? 'active' : ''}`} onClick={() => selectPage(p)}><span>{p.name}</span><small>/{p.slug}</small></button>)}</aside>
      <section className="panel"><div className="section-head"><h3>Paramètres de la page</h3><div className="button-row">{version && <span className="muted">Version {version.version_number}</span>}<button className="icon-button" onClick={deletePage} disabled={busy || !selected} title="Supprimer la page"><Trash2 size={16}/></button></div></div>{selected ? <><div className="form-grid"><label className="form-label">Nom<input className="form-input" value={name} onChange={e => setName(e.target.value)}/></label><label className="form-label">Identifiant (slug)<input className="form-input" value={slug} onChange={e => setSlug(cleanSlug(e.target.value))}/></label></div><label className="form-label">HTML<textarea className="code-input" value={html} onChange={e=>setHtml(e.target.value)}/></label><label className="form-label">CSS<textarea className="code-input" value={css} onChange={e=>setCss(e.target.value)}/></label><label className="form-label">JavaScript<textarea className="code-input" value={js} onChange={e=>setJs(e.target.value)} placeholder="Stocké pour l’environnement d’exécution isolé ; jamais exécuté sur le domaine de l’application Conik."/></label></> : <div className="empty"><b>Sélectionnez une page</b><span>Créez une page pour commencer à l’éditer.</span></div>}</section>
      <section className="panel"><div className="section-head"><h3>Aperçu sécurisé</h3><span className="muted">Bac à sable · scripts désactivés</span></div><iframe title="Aperçu du tunnel" sandbox="" srcDoc={preview} className="preview-frame"/></section>
    </div>
  </div>
}
