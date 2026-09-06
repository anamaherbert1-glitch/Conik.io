'use client'

import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, Globe2, Plus, Save, Trash2, UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Page = { id: string; name: string; slug: string; page_type: string; position: number; published_version_id: string | null }
type Version = { id: string; version_number: number; html: string; css: string; js: string; metadata: Record<string, unknown> }
type CodeTab = 'html' | 'css' | 'js'

const DEFAULT_HTML = '<main style="font-family:system-ui;max-width:900px;margin:80px auto;padding:24px"><h1>Votre tunnel commence ici</h1><p>Importez votre page HTML/ZIP ou modifiez cette page.</p><a href="#cta" id="cta">Commencer</a></main>'
const DEFAULT_CSS = 'body{margin:0;background:#fff;color:#111827}a{font-weight:700;color:#6d28d9}'

function cleanSlug(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) }
function safeRedirect(value: string) {
  const v = value.trim()
  if (!v) return ''
  if (v.startsWith('/')) return v
  try { const u = new URL(v); if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString() } catch {}
  return ''
}
function bindRedirect(source: string, target: string) {
  if (!target) return source
  const escaped = target.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  const anchor = /<a\b([^>]*?)\bhref=(['"])[^'"]*\2([^>]*)>/i
  if (anchor.test(source)) return source.replace(anchor, `<a$1href="${escaped}"$3>`)
  const button = /<button\b([^>]*)>/i
  if (button.test(source)) return source.replace(button, `<a href="${escaped}"$1>`).replace(/<\/button>/i, '</a>')
  return `<p style="margin-top:24px"><a href="${escaped}">Continuer</a></p>${source}`
}

export default function FunnelEditor({ params }: { params: Promise<{ id: string }> }) {
  const [funnelId, setFunnelId] = useState('')
  const [funnel, setFunnel] = useState<{ name: string; slug: string; status: string } | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [selected, setSelected] = useState<Page | null>(null)
  const [version, setVersion] = useState<Version | null>(null)
  const [name, setName] = useState('Home')
  const [slug, setSlug] = useState('home')
  const [html, setHtml] = useState(DEFAULT_HTML)
  const [css, setCss] = useState(DEFAULT_CSS)
  const [js, setJs] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [showCode, setShowCode] = useState(true)
  const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('html')
  const inputRef = useRef<HTMLInputElement>(null)

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
    if (!list.length) { setSelected(null); return }
    const first = (selected?.id && list.find(p => p.id === selected.id)) || list[0]
    await selectPage(first)
  }
  useEffect(() => { void load() }, [funnelId])

  async function selectPage(page: Page) {
    setSelected(page); setName(page.name); setSlug(page.slug); setMessage(''); setShowCode(true); setActiveCodeTab('html')
    const supabase = createClient()
    const { data: v, error } = await supabase.from('funnel_versions').select('id,version_number,html,css,js,metadata').eq('page_id', page.id).order('version_number', { ascending: false }).limit(1).maybeSingle()
    if (error) { setMessage(error.message); return }
    setVersion(v)
    if (v) { setHtml(v.html); setCss(v.css); setJs(v.js); setRedirectUrl(typeof v.metadata?.redirectUrl === 'string' ? v.metadata.redirectUrl : '') }
    else { setHtml(DEFAULT_HTML); setCss(DEFAULT_CSS); setJs(''); setRedirectUrl('') }
  }

  async function createPage() {
    if (!funnelId) return
    setBusy(true); setMessage('')
    const supabase = createClient()
    const isFirstPage = pages.length === 0
    const pageNumber = pages.length + 1
    const base = isFirstPage ? 'home' : `page-${pageNumber}`
    const pageName = `Page ${pageNumber}`
    let clean = base; let suffix = 2
    while (pages.some(p => p.slug === clean)) clean = isFirstPage ? `home-${suffix++}` : `${base}-${suffix++}`
    const { data, error } = await supabase.from('funnel_pages').insert({ funnel_id: funnelId, name: pageName, title: pageName, slug: clean, page_type: 'landing', position: pages.length, html_content: DEFAULT_HTML }).select('id,name,slug,page_type,position,published_version_id').single()
    if (error) { setMessage(error.message); setBusy(false); return }
    const { data: v, error: versionError } = await supabase.from('funnel_versions').insert({ page_id: data.id, version_number: 1, html: DEFAULT_HTML, css: DEFAULT_CSS, js: '', metadata: { editor: 'conik', redirectUrl: '' } }).select('id,version_number,html,css,js,metadata').single()
    if (versionError || !v) { setMessage(versionError?.message || 'Impossible de créer la première version.'); setBusy(false); return }
    setPages(p => [...p, data]); setVersion(v); setHtml(DEFAULT_HTML); setCss(DEFAULT_CSS); setJs(''); setRedirectUrl(''); setSelected(data); setName(data.name); setSlug(data.slug); setShowCode(true); setActiveCodeTab('html'); setMessage(`Page ${pageNumber} créée. Vous pouvez maintenant importer votre HTML/ZIP.`)
    setBusy(false)
  }

  async function importPage() {
    if (!selected) return
    const file = inputRef.current?.files?.[0]
    if (!file) { setMessage('Sélectionnez un fichier HTML ou ZIP.'); return }
    setBusy(true); setMessage('')
    try {
      const body = new FormData(); body.append('file', file); body.append('pageId', selected.id)
      const response = await fetch('/api/funnels/pages/import', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Import impossible.')
      setVersion(data.version); setHtml(data.version.html); setCss(data.version.css); setJs(data.version.js); setName(data.page.name); setActiveCodeTab('html'); setShowCode(true); setMessage(`Page importée avec succès · ${data.assets} asset(s). HTML, CSS et code importés. Cliquez sur « Enregistrer la version » puis « Publier ».`)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Import impossible.') }
    finally { setBusy(false) }
  }

  async function saveVersion() {
    if (!selected) return
    const cleanName = name.trim(); const clean = cleanSlug(slug); const target = safeRedirect(redirectUrl)
    if (cleanName.length < 1 || !clean) { setMessage('Le nom et le slug de la page sont obligatoires.'); return }
    if (pages.some(p => p.id !== selected.id && p.slug === clean)) { setMessage('Cet identifiant de page est déjà utilisé dans ce tunnel.'); return }
    if (redirectUrl.trim() && !target) { setMessage('Le lien de redirection doit être une URL http(s) ou un chemin interne commençant par /.'); return }
    setBusy(true); setMessage('')
    const supabase = createClient(); const finalHtml = bindRedirect(html, target)
    const { error: pageError } = await supabase.from('funnel_pages').update({ name: cleanName, title: cleanName, slug: clean, html_content: finalHtml }).eq('id', selected.id)
    if (pageError) { setMessage(pageError.message); setBusy(false); return }
    const { data: latest, error: latestError } = await supabase.from('funnel_versions').select('version_number').eq('page_id', selected.id).order('version_number', { ascending: false }).limit(1).maybeSingle()
    if (latestError) { setMessage(latestError.message); setBusy(false); return }
    const next = (latest?.version_number || 0) + 1
    const { data: v, error } = await supabase.from('funnel_versions').insert({ page_id: selected.id, version_number: next, html: finalHtml, css, js, metadata: { editor: 'conik', redirectUrl: target } }).select('id,version_number,html,css,js,metadata').single()
    if (error) setMessage(error.message)
    else { setVersion(v); setHtml(finalHtml); setSelected(p => p ? { ...p, name: cleanName, slug: clean } : p); setPages(ps => ps.map(p => p.id === selected.id ? { ...p, name: cleanName, slug: clean } : p)); setRedirectUrl(target); setMessage(`Version ${next} enregistrée.`) }
    setBusy(false)
  }

  async function publish() {
    if (!selected || !version) return
    setBusy(true); setMessage(''); const supabase = createClient()
    const { error } = await supabase.rpc('publish_funnel_page', { target_page: selected.id, target_version: version.id })
    if (error) setMessage(error.message)
    else { setFunnel(f => f ? { ...f, status: 'published' } : f); setPages(ps => ps.map(p => p.id === selected.id ? { ...p, published_version_id: version.id } : p)); setSelected(p => p ? { ...p, published_version_id: version.id } : p); setMessage('Page publiée avec succès.') }
    setBusy(false)
  }

  async function deletePage() {
    if (!selected) return
    if (pages.length <= 1) { setMessage('Un tunnel doit conserver au moins une page.'); return }
    if (!window.confirm(`Supprimer « ${selected.name} » ? Ses versions seront définitivement supprimées.`)) return
    setBusy(true); setMessage(''); const supabase = createClient(); const { error } = await supabase.from('funnel_pages').delete().eq('id', selected.id)
    if (error) setMessage(error.message)
    else { const remaining = pages.filter(p => p.id !== selected.id); setPages(remaining); await selectPage(remaining[0]); setMessage('Page supprimée.') }
    setBusy(false)
  }

  function clearCode(kind: CodeTab) {
    if (kind === 'html') setHtml(DEFAULT_HTML)
    if (kind === 'css') setCss(DEFAULT_CSS)
    if (kind === 'js') setJs('')
    setMessage(`${kind.toUpperCase()} réinitialisé. Cliquez sur « Enregistrer la version » pour conserver la modification.`)
  }

  const codeValue = activeCodeTab === 'html' ? html : activeCodeTab === 'css' ? css : js
  const setCodeValue = activeCodeTab === 'html' ? setHtml : activeCodeTab === 'css' ? setCss : setJs
  const preview = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html}</body></html>`
  if (!funnel) return <div className="page"><p>{message || 'Chargement de l’éditeur de tunnel…'}</p></div>

  return <div className="page">
    <Link href={`/funnels/${funnelId}`} className="back"><ArrowLeft size={15}/>Tunnel</Link>
    <div className="head"><div><small>ÉDITEUR DE TUNNEL</small><h1>{funnel.name}</h1><p>/{funnel.slug} · {funnel.status}</p></div><div className="button-row"><a className="outline" href={`/funnels/${funnelId}/editor`}><Eye size={15}/>Éditeur</a>{funnel.status === 'published' && <a className="outline" href={`/${funnel.slug}`} target="_blank" rel="noreferrer"><Globe2 size={15}/>Ouvrir le tunnel</a>}<button className="primary" onClick={saveVersion} disabled={busy || !selected}><Save size={15}/>{busy ? 'Enregistrement…' : 'Enregistrer la version'}</button><button className="primary" onClick={publish} disabled={busy || !version}><Globe2 size={15}/>Publier</button></div></div>
    {message && <div className="notice">{message}</div>}

    <div className="page-tabs" aria-label="Pages du tunnel">
      <button className="page-add" onClick={createPage} disabled={busy} title="Ajouter une page" aria-label="Ajouter une page"><Plus size={16}/></button>
      <div className="page-tabs-scroll">
        {pages.map(p => {
          const isSelected = selected?.id === p.id
          return <div key={p.id} className={`page-tab-wrap ${isSelected ? 'active' : ''}`}>
            <button className="page-tab" onClick={() => void selectPage(p)} title={`Ouvrir Page ${p.position + 1}`}>
              <span>Page {p.position + 1}</span><small>/{p.slug}</small>
            </button>
            <button className="page-visibility" onClick={(e) => { e.stopPropagation(); if (isSelected) setShowCode(v => !v); else void selectPage(p).then(() => setShowCode(false)) }} title={isSelected && showCode ? 'Masquer le panneau de code' : 'Afficher le panneau de code'} aria-label={isSelected && showCode ? 'Masquer le panneau de code' : 'Afficher le panneau de code'}>
              {isSelected && showCode ? <EyeOff size={14}/> : <Eye size={14}/>} 
            </button>
          </div>
        })}
      </div>
    </div>

    <div className={`editor-grid ${showCode ? '' : 'editor-grid-preview-only'}`}>
      {showCode && <section className="panel code-panel"><div className="section-head"><h3>Page : {selected ? `Page ${selected.position + 1}` : '—'}</h3><div className="button-row"><label className="outline upload-label"><UploadCloud size={15}/>Charger HTML / ZIP<input ref={inputRef} type="file" accept=".html,.htm,.zip,text/html,application/zip" onChange={() => void importPage()} hidden /></label><button className="danger-button" onClick={() => clearCode('html')} disabled={busy || !selected} title="Réinitialiser le contenu HTML"><Trash2 size={15}/>HTML</button><button className="icon-button danger-icon" onClick={() => void deletePage()} disabled={busy || !selected} title="Supprimer la page"><Trash2 size={16}/></button></div></div>{selected ? <>
        <div className="form-grid"><label className="form-label">Nom<input className="form-input" value={name} onChange={e => setName(e.target.value)}/></label><label className="form-label">Slug<input className="form-input" value={slug} onChange={e => setSlug(cleanSlug(e.target.value))}/></label></div>
        <label className="form-label">Lien de redirection de cette page / CTA<input className="form-input" value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder="https://exemple.com/merci ou /page-2"/><small className="muted">Chaque page possède son propre lien de redirection. Il est appliqué au premier bouton ou lien d'action trouvé lors de l'enregistrement.</small></label>
        <div className="code-tabs" role="tablist" aria-label="Code de la page">
          {(['html','css','js'] as CodeTab[]).map(tab => <button key={tab} className={`code-tab ${activeCodeTab === tab ? 'active' : ''}`} onClick={() => setActiveCodeTab(tab)} role="tab" aria-selected={activeCodeTab === tab}>{tab === 'html' ? 'HTML' : tab === 'css' ? 'CSS' : 'JavaScript'}</button>)}
          <button className="code-trash" onClick={() => clearCode(activeCodeTab)} disabled={busy} title={`Réinitialiser ${activeCodeTab.toUpperCase()}`} aria-label={`Réinitialiser ${activeCodeTab.toUpperCase()}`}><Trash2 size={15}/></button>
        </div>
        <label className="form-label code-editor-label"><span className="sr-only">{activeCodeTab.toUpperCase()}</span><textarea className="code-input code-input-large" value={codeValue} onChange={e=>setCodeValue(e.target.value)} placeholder={activeCodeTab === 'html' ? 'Code HTML…' : activeCodeTab === 'css' ? 'Code CSS…' : 'Code JavaScript…'}/></label>
      </> : <div className="empty"><b>Créez une page</b><span>Une page sera enregistrée avant l'import de votre HTML/ZIP.</span></div>}</section>}
      <section className="panel preview-panel"><div className="section-head"><h3>Aperçu</h3><span className="muted">Bac à sable · scripts désactivés</span></div><iframe title="Aperçu du tunnel" sandbox="" srcDoc={preview} className="preview-frame"/></section>
    </div>
  </div>
}
