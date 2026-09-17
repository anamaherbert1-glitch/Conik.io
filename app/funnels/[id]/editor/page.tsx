'use client'

import Link from 'next/link'
import { ArrowLeft, Check, Copy, Eye, EyeOff, FileCode2, FileType2, Globe2, ImageIcon, Plus, Save, Trash2, UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Page = { id: string; name: string; slug: string; page_type: string; position: number; published_version_id: string | null }
type Version = { id: string; version_number: number; html: string; css: string; js: string; metadata: Record<string, unknown> }
type CodeTab = 'html' | 'css' | 'js'
type RedirectControl = { key: string; tag: string; label: string; target: string; existing: boolean; actionType: 'url' | 'onclick' | 'none' }

const DEFAULT_HTML = '<main style="font-family:system-ui;max-width:900px;margin:80px auto;padding:24px"><h1>Votre tunnel commence ici</h1><p>Importez votre HTML, CSS ou JavaScript.</p><a href="#cta" id="cta">Commencer</a></main>'
const DEFAULT_CSS = 'body{margin:0;background:#fff;color:#111827}a{font-weight:700;color:#ea580c}'

function cleanSlug(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) }
function safeRedirect(value: string) { const v = value.trim(); if (!v) return ''; if (v.startsWith('/')) return v; try { const u = new URL(v); if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString() } catch {} return '' }
function escapeAttr(value: string) { return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
function escapeJs(value: string) { return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n') }

function detectRedirectControls(source: string): RedirectControl[] {
  const controls: RedirectControl[] = []
  let i = 0
  const push = (tag: string, attrs: string, body: string) => {
    const id = (attrs.match(/\bid=["']([^"']+)["']/i)?.[1] || '').trim()
    const aria = (attrs.match(/\baria-label=["']([^"']+)["']/i)?.[1] || '').trim()
    const cls = (attrs.match(/\bclass=["']([^"']+)["']/i)?.[1] || '').trim()
    const href = (attrs.match(/\bhref=["']([^"']*)["']/i)?.[1] || '').trim()
    const dataRedirect = (attrs.match(/\bdata-conik-redirect=["']([^"']*)["']/i)?.[1] || '').trim()
    const onclick = (attrs.match(/\bonclick=["']([^"']*)["']/i)?.[1] || '').trim()
    const target = href || dataRedirect
    const actionType: RedirectControl['actionType'] = target ? 'url' : onclick ? 'onclick' : 'none'
    const cleanBody = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const label = id ? `#${id}` : aria || cleanBody || (cls ? `.${cls.split(/\s+/)[0]}` : `${tag === 'button' ? 'Bouton' : 'Élément'} ${i + 1}`)
    i++
    controls.push({ key: `${tag}-${i}-${id || cleanBody.slice(0, 20)}`, tag, label, target, existing: Boolean(target || onclick), actionType })
  }
  const pairRe = /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = pairRe.exec(source)) !== null) push(m[1].toLowerCase(), m[2] || '', m[3] || '')
  const inputRe = /<input\b([^>]*\btype=["'](?:button|submit|reset)["'][^>]*)\/?\s*>/gi
  while ((m = inputRe.exec(source)) !== null) push('input', m[1] || '', '')
  const roleRe = /<(div|span|p|li)\b([^>]*\brole=["']button["'][^>]*)>([\s\S]*?)<\/\1>/gi
  while ((m = roleRe.exec(source)) !== null) push(m[1].toLowerCase(), m[2] || '', m[3] || '')
  return controls
}

function applyButtonRedirects(source: string, controls: RedirectControl[]) {
  let i = 0
  let html = source.replace(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (full, tag, attrs, body) => {
    const c = controls[i++]; if (!c || !c.target) return full
    const target = escapeAttr(c.target), js = escapeJs(c.target)
    const without = attrs.replace(/\sdata-conik-redirect=(?:"[^"]*"|'[^']*')/i, '').replace(/\sonclick=(?:"[^"]*"|'[^']*')/i, '')
    return `<${tag}${without} data-conik-redirect="${target}" onclick="window.location.href='${js}'; return false;">${body}</${tag}>`
  })
  html = html.replace(/<input\b([^>]*\btype=["'](?:button|submit|reset)["'][^>]*)\/?\s*>/gi, (full, attrs) => {
    const c = controls[i++]; if (!c || !c.target) return full
    const target = escapeAttr(c.target), js = escapeJs(c.target)
    const without = attrs.replace(/\sdata-conik-redirect=(?:"[^"]*"|'[^']*')/i, '').replace(/\sonclick=(?:"[^"]*"|'[^']*')/i, '')
    return `<input${without} data-conik-redirect="${target}" onclick="window.location.href='${js}'; return false;">`
  })
  html = html.replace(/<(div|span|p|li)\b([^>]*\brole=["']button["'][^>]*)>([\s\S]*?)<\/\1>/gi, (full, tag, attrs, body) => {
    const c = controls[i++]; if (!c || !c.target) return full
    const target = escapeAttr(c.target), js = escapeJs(c.target)
    const without = attrs.replace(/\sdata-conik-redirect=(?:"[^"]*"|'[^']*')/i, '').replace(/\sonclick=(?:"[^"]*"|'[^']*')/i, '')
    return `<${tag}${without} data-conik-redirect="${target}" onclick="window.location.href='${js}'; return false;">${body}</${tag}>`
  })
  return html
}

export default function FunnelEditor({ params }: { params: Promise<{ id: string }> }) {
  const [funnelId, setFunnelId] = useState(''), [funnel, setFunnel] = useState<{ name: string; slug: string; status: string } | null>(null), [pages, setPages] = useState<Page[]>([]), [selected, setSelected] = useState<Page | null>(null), [version, setVersion] = useState<Version | null>(null)
  const [name, setName] = useState('Home'), [slug, setSlug] = useState('home'), [html, setHtml] = useState(DEFAULT_HTML), [css, setCss] = useState(DEFAULT_CSS), [js, setJs] = useState(''), [redirectControls, setRedirectControls] = useState<RedirectControl[]>([]), [selectedControl, setSelectedControl] = useState<number | null>(null)
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [showCode, setShowCode] = useState(true), [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('html'), [copied, setCopied] = useState(false), [shareImageUrl, setShareImageUrl] = useState('')
  const htmlInputRef = useRef<HTMLInputElement>(null), cssInputRef = useRef<HTMLInputElement>(null), jsInputRef = useRef<HTMLInputElement>(null), shareImageInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { params.then((p) => setFunnelId(p.id)) }, [params])

  async function load() {
    if (!funnelId) return
    const supabase = createClient()
    const { data: f, error: funnelError } = await supabase.from('funnels').select('name,slug,status').eq('id', funnelId).single()
    if (funnelError || !f) { setMessage('Tunnel introuvable ou accès refusé.'); return }
    setFunnel(f)
    const { data: ps, error: pagesError } = await supabase.from('funnel_pages').select('id,name,slug,page_type,position,published_version_id').eq('funnel_id', funnelId).order('position')
    if (pagesError) { setMessage(pagesError.message); return }
    const list = ps || []; setPages(list); if (!list.length) { setSelected(null); return }
    const first = (selected?.id && list.find((p) => p.id === selected.id)) || list[0]; await selectPage(first)
  }
  useEffect(() => { void load() }, [funnelId])

  async function selectPage(page: Page) {
    setSelected(page); setName(page.name); setSlug(page.slug); setMessage(''); setShowCode(true); setActiveCodeTab('html'); setCopied(false); setSelectedControl(null); setShareImageUrl('')
    const supabase = createClient()
    const { data: v, error } = await supabase.from('funnel_versions').select('id,version_number,html,css,js,metadata').eq('page_id', page.id).order('version_number', { ascending: false }).limit(1).maybeSingle()
    if (error) { setMessage(error.message); return }
    if (!v) { setVersion(null); setHtml(DEFAULT_HTML); setCss(DEFAULT_CSS); setJs(''); setRedirectControls([]); return }
    setVersion(v); setHtml(v.html || DEFAULT_HTML); setCss(v.css || DEFAULT_CSS); setJs(v.js || ''); setRedirectControls(detectRedirectControls(v.html || '')); setShareImageUrl(typeof v.metadata?.share_image_url === 'string' ? v.metadata.share_image_url : '')
  }

  async function createPage() {
    if (!funnelId) return; setBusy(true); setMessage(''); const supabase = createClient(); const pageNumber = pages.length + 1; const base = pages.length === 0 ? 'home' : `page-${pageNumber}`; const pageName = `Page ${pageNumber}`; let clean = base, suffix = 2
    while (pages.some((p) => p.slug === clean)) clean = `${base}-${suffix++}`
    const { data, error } = await supabase.from('funnel_pages').insert({ funnel_id: funnelId, name: pageName, slug: clean, page_type: 'landing', position: pages.length }).select('id,name,slug,page_type,position,published_version_id').single()
    if (error) { setMessage(error.message); setBusy(false); return }
    const { data: v, error: versionError } = await supabase.from('funnel_versions').insert({ page_id: data.id, version_number: 1, html: DEFAULT_HTML, css: DEFAULT_CSS, js: '', metadata: { editor: 'conik' } }).select('id,version_number,html,css,js,metadata').single()
    if (versionError || !v) { setMessage(versionError?.message || 'Impossible de créer la première version.'); setBusy(false); return }
    setPages((p) => [...p, data]); setVersion(v); setHtml(DEFAULT_HTML); setCss(DEFAULT_CSS); setJs(''); setRedirectControls(detectRedirectControls(DEFAULT_HTML)); setSelected(data); setName(data.name); setSlug(data.slug); setShowCode(true); setActiveCodeTab('html'); setMessage(`Page ${pageNumber} créée.`); setBusy(false)
  }

  async function importHtmlOrZip(file: File) {
    if (!selected) return
    const MAX_MB = 4.5
    if (file.size > MAX_MB * 1024 * 1024) {
      setMessage(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : ${MAX_MB} Mo. Compressez le ZIP ou retirez des images/vidéos.`)
      return
    }
    setBusy(true)
    setMessage(`Envoi de « ${file.name} »… 0 %`)
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('pageId', selected.id)
      const data: any = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/funnels/pages/import')
        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return
          const pct = Math.min(99, Math.round((e.loaded / e.total) * 100))
          setMessage(`Téléversement… ${pct} % · ${(e.loaded / 1024 / 1024).toFixed(1)} / ${(e.total / 1024 / 1024).toFixed(1)} Mo`)
        }
        xhr.upload.onload = () => setMessage('Import serveur en cours (analyse HTML et assets)…')
        xhr.onload = () => {
          const text = xhr.responseText || ''
          let parsed: any = null
          try { parsed = text ? JSON.parse(text) : null } catch {
            if (/entity too large|request entity|413/i.test(text) || xhr.status === 413) {
              reject(new Error(`Fichier trop volumineux pour le serveur (limite ~${MAX_MB} Mo). Réduisez le ZIP.`)); return
            }
            reject(new Error(text.replace(/<[^>]+>/g, ' ').trim().slice(0, 200) || `Erreur serveur (${xhr.status}).`)); return
          }
          if (xhr.status >= 200 && xhr.status < 300) resolve(parsed)
          else reject(new Error(parsed?.error || parsed?.message || `Import impossible (${xhr.status}).`))
        }
        xhr.onerror = () => reject(new Error('Réseau interrompu pendant l’envoi.'))
        xhr.ontimeout = () => reject(new Error('Délai dépassé. Réessayez avec un fichier plus léger.'))
        xhr.timeout = 120000
        xhr.send(body)
      })
      setVersion(data.version); setHtml(data.version.html); setCss(data.version.css); setJs(data.version.js); setName(data.page.name)
      const detected = detectRedirectControls(data.version.html)
      setRedirectControls(detected); setSelectedControl(null); setActiveCodeTab('html'); setShowCode(true)
      setMessage(`Import terminé · ${data.assets ?? 0} asset(s) · ${detected.length} élément(s) interactif(s).`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function importTextFile(file: File, kind: 'css' | 'js') {
    if (!selected) return; setBusy(true); setMessage(`Import ${kind.toUpperCase()}…`)
    try {
      const text = await file.text()
      if (kind === 'css') { setCss(text); setActiveCodeTab('css') } else { setJs(text); setActiveCodeTab('js') }
      setMessage(`${kind.toUpperCase()} importé. Enregistrez la version pour le conserver.`)
    } catch { setMessage('Import impossible.') } finally { setBusy(false) }
  }

  async function saveVersion() {
    if (!selected) return; setBusy(true); setMessage('')
    const supabase = createClient()
    const finalHtml = applyButtonRedirects(html, redirectControls)
    const normalized = redirectControls.filter((c) => c.target).map((c) => ({ key: c.key, target: safeRedirect(c.target) || c.target }))
    const { data: latest } = await supabase.from('funnel_versions').select('version_number').eq('page_id', selected.id).order('version_number', { ascending: false }).limit(1).maybeSingle()
    const next = (latest?.version_number || 0) + 1
    const { data: v, error } = await supabase.from('funnel_versions').insert({ page_id: selected.id, version_number: next, html: finalHtml, css, js, metadata: { editor: 'conik', redirects: normalized, ...(shareImageUrl ? { share_image_url: shareImageUrl } : {}) } }).select('id,version_number,html,css,js,metadata').single()
    if (error) { setMessage(error.message); setBusy(false); return }
    setVersion(v); setHtml(finalHtml); setMessage(`Version ${next} enregistrée.`); setBusy(false)
  }

  async function publish() {
    if (!selected || !version) return; setBusy(true); setMessage('')
    const supabase = createClient()
    const { error } = await supabase.rpc('publish_funnel_page', { target_page: selected.id, target_version: version.id })
    if (error) setMessage(error.message); else { setMessage('Page publiée.'); await load() }
    setBusy(false)
  }

  async function deletePage() {
    if (!selected || !confirm('Supprimer cette page ?')) return; setBusy(true)
    const supabase = createClient(); const { error } = await supabase.from('funnel_pages').delete().eq('id', selected.id)
    if (error) setMessage(error.message); else { const remaining = pages.filter((p) => p.id !== selected.id); setPages(remaining); if (remaining[0]) await selectPage(remaining[0]); else setSelected(null); setMessage('Page supprimée.') }
    setBusy(false)
  }

  function pagePublicPath(pageSlug: string) { return funnel ? `/${funnel.slug}/${pageSlug}` : '' }
  function pagePublicUrl(pageSlug: string) { return typeof window === 'undefined' ? pagePublicPath(pageSlug) : `${window.location.origin}${pagePublicPath(pageSlug)}` }
  async function copyPageLink() { if (!selected || !funnel) return; try { await navigator.clipboard.writeText(pagePublicUrl(selected.slug)); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { setMessage('Impossible de copier le lien.') } }

  async function uploadShareImage(file: File) {
    if (!selected) return
    setBusy(true); setMessage('Import de l’image de partage…')
    try {
      const body = new FormData(); body.append('pageId', selected.id); body.append('file', file)
      const response = await fetch('/api/funnels/pages/share-image', { method: 'POST', body })
      const text = await response.text()
      let data: any = {}
      try { data = text ? JSON.parse(text) : {} } catch { throw new Error(text.slice(0, 180) || 'Réponse serveur illisible.') }
      if (!response.ok) throw new Error(data.error || 'Import de l’image impossible.')
      setShareImageUrl(data.imageUrl || '')
      setVersion((current) => current ? { ...current, metadata: { ...(current.metadata || {}), share_image_url: data.imageUrl } } : current)
      setMessage('Image de partage enregistrée.')
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Import de l’image impossible.') }
    finally { setBusy(false) }
  }

  function setRedirectTarget(index: number, value: string) { setRedirectControls((cs) => cs.map((x, n) => n === index ? { ...x, target: value, existing: Boolean(value.trim()), actionType: value.trim() ? 'url' : 'none' } : x)) }
  function onSelectInternalPage(index: number, pageSlug: string) { if (!funnel) return; if (pageSlug === '__custom__') return; setRedirectTarget(index, pageSlug ? `/${funnel.slug}/${pageSlug}` : '') }
  function selectedInternalSlug(target: string) { if (!funnel || !target.startsWith('/')) return '__custom__'; const match = pages.find((p) => `/${funnel.slug}/${p.slug}` === target); return match ? match.slug : '__custom__' }
  const codeValue = activeCodeTab === 'html' ? html : activeCodeTab === 'css' ? css : js, setCodeValue = activeCodeTab === 'html' ? setHtml : activeCodeTab === 'css' ? setCss : setJs
  const preview = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`

  if (!funnel) return <div className="page"><p>{message || 'Chargement de l’éditeur de tunnel…'}</p></div>

  return (
    <div className="page editor-page">
      <Link href={`/funnels/${funnelId}`} className="back"><ArrowLeft size={15} /> Tunnel</Link>
      <small>ÉDITEUR DE TUNNEL</small>
      <h1>{funnel.name}</h1>
      <p className="muted">/{funnel.slug} · {funnel.status}</p>
      <div className="button-row" style={{ marginBottom: 16 }}>
        <a className="outline" href={`/${funnel.slug}`} target="_blank" rel="noreferrer"><Globe2 size={15} /> Ouvrir le tunnel</a>
        <button className="primary" onClick={() => void saveVersion()} disabled={busy || !selected}><Save size={15} /> Enregistrer la version</button>
        <button className="primary" onClick={() => void publish()} disabled={busy || !selected || !version}>Publier</button>
      </div>
      {message && <div className="notice">{message}</div>}

      <section className="panel">
        <div className="section-head">
          <h3>Pages</h3>
          <button className="outline" onClick={() => void createPage()} disabled={busy}><Plus size={15} /> Nouvelle page</button>
        </div>
        <div className="button-row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {pages.map((p) => (
            <button key={p.id} className={selected?.id === p.id ? 'primary' : 'outline'} onClick={() => void selectPage(p)}>
              Page {p.position + 1} <small>/{p.slug}</small>
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <section className="panel">
          <div className="section-head">
            <h3>Page : Page {selected.position + 1}</h3>
            <div className="button-row editor-actions">
              <label className="outline upload-label import-button"><UploadCloud size={16} />Importer HTML / ZIP
                <input ref={htmlInputRef} type="file" accept=".html,.htm,.zip,text/html,application/zip" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importHtmlOrZip(f); e.currentTarget.value = '' }} />
              </label>
              <label className="outline upload-label import-button"><FileType2 size={16} />Importer CSS
                <input ref={cssInputRef} type="file" accept=".css,text/css" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importTextFile(f, 'css'); e.currentTarget.value = '' }} />
              </label>
              <label className="outline upload-label import-button"><FileCode2 size={16} />Importer JavaScript
                <input ref={jsInputRef} type="file" accept=".js,.mjs,text/javascript,application/javascript" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importTextFile(f, 'js'); e.currentTarget.value = '' }} />
              </label>
              <button className="danger-button page-delete-button" onClick={() => void deletePage()} disabled={busy || !selected}><Trash2 size={15} />Supprimer</button>
            </div>
          </div>

          <div style={{ marginTop: 12, padding: 14, border: '1px solid #e5e7eb', borderRadius: 12 }}>
            <h4 style={{ margin: 0 }}>Lien public de cette page</h4>
            <div className="button-row" style={{ marginTop: 8 }}>
              <code style={{ flex: 1 }}>{pagePublicUrl(selected.slug)}</code>
              <button className="outline" onClick={() => void copyPageLink()}>{copied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier</>}</button>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Photo de partage de cette page</div>
              {shareImageUrl ? <div style={{ width: 160, height: 84, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}><img src={shareImageUrl} alt="Aperçu partage" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div> : null}
              <label className="outline upload-label import-button" style={{ display: 'inline-flex', cursor: busy ? 'not-allowed' : 'pointer' }}>
                <ImageIcon size={15} />{shareImageUrl ? 'Changer la photo' : 'Importer une photo'}
                <input ref={shareImageInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadShareImage(f); e.currentTarget.value = '' }} />
              </label>
            </div>
          </div>

          <div className="button-row" style={{ marginTop: 12 }}>
            <button className="outline" onClick={() => setShowCode((s) => !s)}>{showCode ? <><EyeOff size={14} /> Masquer le code</> : <><Eye size={14} /> Afficher le code</>}</button>
          </div>

          {showCode && (
            <>
              <div className="code-tabs" style={{ marginTop: 12 }}>
                <button className={activeCodeTab === 'html' ? 'active' : ''} onClick={() => setActiveCodeTab('html')}>HTML</button>
                <button className={activeCodeTab === 'css' ? 'active' : ''} onClick={() => setActiveCodeTab('css')}>CSS</button>
                <button className={activeCodeTab === 'js' ? 'active' : ''} onClick={() => setActiveCodeTab('js')}>JavaScript</button>
              </div>
              <textarea className="code-editor" value={codeValue} onChange={(e) => { setCodeValue(e.target.value); if (activeCodeTab === 'html') { const detected = detectRedirectControls(e.target.value); setRedirectControls(detected.map((d, i) => ({ ...d, target: redirectControls[i]?.target || d.target || '', existing: Boolean(redirectControls[i]?.target || d.existing || d.target) }))) } }} spellCheck={false} />
            </>
          )}

          <div style={{ marginTop: 16 }}>
            <h4>Redirections des boutons</h4>
            {redirectControls.length ? redirectControls.map((c, i) => {
              const internalSlug = selectedInternalSlug(c.target)
              const custom = internalSlug === '__custom__'
              return (
                <div key={c.key} style={{ marginBottom: 10, padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between' }}><span>{c.label} <small>({c.tag})</small></span><strong style={{ fontSize: 11 }}>{c.existing ? 'Configuré' : 'À configurer'}</strong></span>
                  <select value={internalSlug} onChange={(e) => { const val = e.target.value; if (val === '__custom__') { if (c.target && internalSlug !== '__custom__') setRedirectTarget(i, '') } else onSelectInternalPage(i, val) }}>
                    <option value="">— Aucune redirection —</option>
                    {pages.filter((p) => p.id !== selected?.id).map((p) => <option key={p.id} value={p.slug}>Page {p.position + 1} — {p.name}</option>)}
                    <option value="__custom__">URL personnalisée…</option>
                  </select>
                  {custom && <input value={c.target} onChange={(e) => setRedirectTarget(i, e.target.value)} placeholder="https://exemple.com" />}
                </div>
              )
            }) : <div className="muted">Aucun élément interactif détecté.</div>}
          </div>
        </section>
      )}

      <section className="panel preview-panel">
        <div className="section-head"><h3>Aperçu</h3><span className="muted">Page {selected ? selected.position + 1 : '—'}</span></div>
        <iframe title="Aperçu" sandbox="allow-scripts allow-forms" srcDoc={preview} style={{ width: '100%', minHeight: 650, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }} />
      </section>
    </div>
  )
}
