'use client'

import Link from 'next/link'
import { ArrowLeft, Check, Copy, Eye, EyeOff, FileCode2, FileType2, Globe2, Plus, Save, Trash2, UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Page = { id: string; name: string; slug: string; page_type: string; position: number; published_version_id: string | null }
type Version = { id: string; version_number: number; html: string; css: string; js: string; metadata: Record<string, unknown> }
type CodeTab = 'html' | 'css' | 'js'
type RedirectControl = { key: string; tag: string; label: string; target: string }

const DEFAULT_HTML = '<main style="font-family:system-ui;max-width:900px;margin:80px auto;padding:24px"><h1>Votre tunnel commence ici</h1><p>Importez votre HTML, CSS ou JavaScript.</p><a href="#cta" id="cta">Commencer</a></main>'
const DEFAULT_CSS = 'body{margin:0;background:#fff;color:#111827}a{font-weight:700;color:#ea580c}'

function cleanSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}

function safeRedirect(value: string) {
  const v = value.trim()
  if (!v) return ''
  if (v.startsWith('/')) return v
  try {
    const u = new URL(v)
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString()
  } catch {}
  return ''
}

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeJs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')
}

/** Détecte les éléments cliquables : <a>, <button>, <input type=button|submit>, éléments role=button */
function detectRedirectControls(source: string): RedirectControl[] {
  const controls: RedirectControl[] = []
  let i = 0

  // 1. <a> et <button> avec contenu
  const pairRe = /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = pairRe.exec(source)) !== null) {
    const tag = m[1].toLowerCase()
    const attrs = m[2] || ''
    const body = (m[3] || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const id = (attrs.match(/\bid=["']([^"']+)["']/i)?.[1] || '').trim()
    const aria = (attrs.match(/\baria-label=["']([^"']+)["']/i)?.[1] || '').trim()
    const cls = (attrs.match(/\bclass=["']([^"']+)["']/i)?.[1] || '').trim()
    const existing = tag === 'a' ? (attrs.match(/\bhref=["']([^"']*)["']/i)?.[1] || '').trim() : (attrs.match(/\bdata-conik-redirect=["']([^"']*)["']/i)?.[1] || '').trim()
    i++
    const label = id ? `#${id}` : aria || body || (cls ? `.${cls.split(/\s+/)[0]}` : `${tag === 'button' ? 'Bouton' : 'Lien'} ${i}`)
    controls.push({ key: `${tag}-${i}-${id || body.slice(0, 20)}`, tag, label, target: existing })
  }

  // 2. <input type="button|submit">
  const inputRe = /<input\b([^>]*\btype=["'](?:button|submit)["'][^>]*)\/?\s*>/gi
  while ((m = inputRe.exec(source)) !== null) {
    const attrs = m[1] || ''
    const id = (attrs.match(/\bid=["']([^"']+)["']/i)?.[1] || '').trim()
    const value = (attrs.match(/\bvalue=["']([^"']+)["']/i)?.[1] || '').trim()
    const aria = (attrs.match(/\baria-label=["']([^"']+)["']/i)?.[1] || '').trim()
    const existing = (attrs.match(/\bdata-conik-redirect=["']([^"']*)["']/i)?.[1] || '').trim()
    i++
    controls.push({
      key: `input-${i}-${id || value}`,
      tag: 'input',
      label: id ? `#${id}` : aria || value || `Bouton input ${i}`,
      target: existing,
    })
  }

  // 3. Éléments avec role="button" (div/span/etc.)
  const roleRe = /<(div|span|p|li)\b([^>]*\brole=["']button["'][^>]*)>([\s\S]*?)<\/\1>/gi
  while ((m = roleRe.exec(source)) !== null) {
    const tag = m[1].toLowerCase()
    const attrs = m[2] || ''
    const body = (m[3] || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const id = (attrs.match(/\bid=["']([^"']+)["']/i)?.[1] || '').trim()
    const aria = (attrs.match(/\baria-label=["']([^"']+)["']/i)?.[1] || '').trim()
    const existing = (attrs.match(/\bdata-conik-redirect=["']([^"']*)["']/i)?.[1] || '').trim()
    i++
    controls.push({
      key: `role-${tag}-${i}-${id || body.slice(0, 20)}`,
      tag,
      label: id ? `#${id}` : aria || body || `Bouton ${i}`,
      target: existing,
    })
  }

  return controls
}

function applyButtonRedirects(source: string, controls: RedirectControl[]) {
  let i = 0

  // Appliquer sur <a> et <button>
  let html = source.replace(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (full, tag, attrs, body) => {
    const c = controls[i++]
    if (!c?.target) return full
    const target = escapeAttr(c.target)
    const lower = String(tag).toLowerCase()
    if (lower === 'a') {
      const replaced = /\bhref\s*=\s*(["'])[^"']*\1/i.test(attrs)
        ? attrs.replace(/\bhref\s*=\s*(["'])[^"']*\1/i, `href="${target}"`)
        : `${attrs} href="${target}"`
      return `<${tag}${replaced}>${body}</${tag}>`
    }
    const js = escapeJs(c.target)
    const without = attrs
      .replace(/\sdata-conik-redirect=(?:"[^"]*"|'[^']*')/i, '')
      .replace(/\sonclick=(?:"[^"]*"|'[^']*')/i, '')
    return `<${tag}${without} data-conik-redirect="${target}" onclick="window.location.href='${js}'; return false;">${body}</${tag}>`
  })

  // Appliquer sur <input type=button|submit>
  html = html.replace(/<input\b([^>]*\btype=["'](?:button|submit)["'][^>]*)(\/?\s*)>/gi, (full, attrs, end) => {
    const c = controls[i++]
    if (!c?.target) return full
    const target = escapeAttr(c.target)
    const js = escapeJs(c.target)
    const without = attrs
      .replace(/\sdata-conik-redirect=(?:"[^"]*"|'[^']*')/i, '')
      .replace(/\sonclick=(?:"[^"]*"|'[^']*')/i, '')
    return `<input${without} data-conik-redirect="${target}" onclick="window.location.href='${js}'; return false;"${end}>`
  })

  // Appliquer sur role=button
  html = html.replace(/<(div|span|p|li)\b([^>]*\brole=["']button["'][^>]*)>([\s\S]*?)<\/\1>/gi, (full, tag, attrs, body) => {
    const c = controls[i++]
    if (!c?.target) return full
    const target = escapeAttr(c.target)
    const js = escapeJs(c.target)
    const without = attrs
      .replace(/\sdata-conik-redirect=(?:"[^"]*"|'[^']*')/i, '')
      .replace(/\sonclick=(?:"[^"]*"|'[^']*')/i, '')
    return `<${tag}${without} data-conik-redirect="${target}" onclick="window.location.href='${js}'; return false;">${body}</${tag}>`
  })

  return html
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
  const [redirectControls, setRedirectControls] = useState<RedirectControl[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [showCode, setShowCode] = useState(true)
  const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('html')
  const [copied, setCopied] = useState(false)
  const htmlInputRef = useRef<HTMLInputElement>(null)
  const cssInputRef = useRef<HTMLInputElement>(null)
  const jsInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    params.then((p) => setFunnelId(p.id))
  }, [params])

  async function load() {
    if (!funnelId) return
    const supabase = createClient()
    const { data: f, error: funnelError } = await supabase.from('funnels').select('name,slug,status').eq('id', funnelId).single()
    if (funnelError || !f) {
      setMessage('Tunnel introuvable ou accès refusé.')
      return
    }
    setFunnel(f)
    const { data: ps, error: pagesError } = await supabase
      .from('funnel_pages')
      .select('id,name,slug,page_type,position,published_version_id')
      .eq('funnel_id', funnelId)
      .order('position')
    if (pagesError) {
      setMessage(pagesError.message)
      return
    }
    const list = ps || []
    setPages(list)
    if (!list.length) {
      setSelected(null)
      return
    }
    const first = (selected?.id && list.find((p) => p.id === selected.id)) || list[0]
    await selectPage(first)
  }

  useEffect(() => {
    void load()
  }, [funnelId])

  async function selectPage(page: Page) {
    setSelected(page)
    setName(page.name)
    setSlug(page.slug)
    setMessage('')
    setShowCode(true)
    setActiveCodeTab('html')
    setCopied(false)
    const supabase = createClient()
    const { data: v, error } = await supabase
      .from('funnel_versions')
      .select('id,version_number,html,css,js,metadata')
      .eq('page_id', page.id)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) {
      setMessage(error.message)
      return
    }
    setVersion(v)
    if (v) {
      setHtml(v.html)
      setCss(v.css)
      setJs(v.js)
      const stored = Array.isArray(v.metadata?.redirects) ? (v.metadata.redirects as RedirectControl[]) : []
      const detected = detectRedirectControls(v.html)
      setRedirectControls(detected.map((d, i) => ({ ...d, target: stored[i]?.target || d.target || '' })))
    } else {
      setHtml(DEFAULT_HTML)
      setCss(DEFAULT_CSS)
      setJs('')
      setRedirectControls(detectRedirectControls(DEFAULT_HTML))
    }
  }

  async function createPage() {
    if (!funnelId) return
    setBusy(true)
    setMessage('')
    const supabase = createClient()
    const pageNumber = pages.length + 1
    const base = pages.length === 0 ? 'home' : `page-${pageNumber}`
    const pageName = `Page ${pageNumber}`
    let clean = base
    let suffix = 2
    while (pages.some((p) => p.slug === clean)) clean = pages.length === 0 ? `home-${suffix++}` : `${base}-${suffix++}`
    const { data, error } = await supabase
      .from('funnel_pages')
      .insert({
        funnel_id: funnelId,
        name: pageName,
        title: pageName,
        slug: clean,
        page_type: 'landing',
        position: pages.length,
        html_content: DEFAULT_HTML,
      })
      .select('id,name,slug,page_type,position,published_version_id')
      .single()
    if (error) {
      setMessage(error.message)
      setBusy(false)
      return
    }
    const { data: v, error: versionError } = await supabase
      .from('funnel_versions')
      .insert({
        page_id: data.id,
        version_number: 1,
        html: DEFAULT_HTML,
        css: DEFAULT_CSS,
        js: '',
        metadata: { editor: 'conik', redirects: [] },
      })
      .select('id,version_number,html,css,js,metadata')
      .single()
    if (versionError || !v) {
      setMessage(versionError?.message || 'Impossible de créer la première version.')
      setBusy(false)
      return
    }
    setPages((p) => [...p, data])
    setVersion(v)
    setHtml(DEFAULT_HTML)
    setCss(DEFAULT_CSS)
    setJs('')
    setRedirectControls(detectRedirectControls(DEFAULT_HTML))
    setSelected(data)
    setName(data.name)
    setSlug(data.slug)
    setShowCode(true)
    setActiveCodeTab('html')
    setMessage(`Page ${pageNumber} créée.`)
    setBusy(false)
  }

  async function importHtmlOrZip(file: File) {
    if (!selected) return
    setBusy(true)
    setMessage('Import HTML/ZIP en cours…')
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('pageId', selected.id)
      const response = await fetch('/api/funnels/pages/import', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Import impossible.')
      setVersion(data.version)
      setHtml(data.version.html)
      setCss(data.version.css)
      setJs(data.version.js)
      setName(data.page.name)
      setRedirectControls(detectRedirectControls(data.version.html))
      setActiveCodeTab('html')
      setShowCode(true)
      const count = detectRedirectControls(data.version.html).length
      setMessage(`HTML/ZIP importé avec succès · ${data.assets} asset(s). ${count} bouton(s)/lien(s) détecté(s).`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function importTextFile(file: File, kind: 'css' | 'js') {
    if (!selected) return
    setBusy(true)
    setMessage(`Import ${kind.toUpperCase()} en cours…`)
    try {
      const text = await file.text()
      if (!text.trim()) throw new Error(`Le fichier ${kind.toUpperCase()} est vide.`)
      if (kind === 'css') {
        setCss(text)
        setActiveCodeTab('css')
      } else {
        setJs(text)
        setActiveCodeTab('js')
      }
      setShowCode(true)
      setMessage(`${kind.toUpperCase()} importé. Cliquez sur « Enregistrer la version » pour le conserver.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : `Import ${kind.toUpperCase()} impossible.`)
    } finally {
      setBusy(false)
    }
  }

  async function saveVersion() {
    if (!selected) return
    const cleanName = name.trim()
    const clean = cleanSlug(slug)
    if (!cleanName || !clean) {
      setMessage('Le nom et le slug de la page sont obligatoires.')
      return
    }
    if (pages.some((p) => p.id !== selected.id && p.slug === clean)) {
      setMessage('Cet identifiant de page est déjà utilisé dans ce tunnel.')
      return
    }
    const targets = redirectControls.map((c) => safeRedirect(c.target))
    if (redirectControls.some((c, i) => c.target.trim() && !targets[i])) {
      setMessage('Chaque lien de redirection doit être une URL http(s) ou un chemin interne commençant par /.')
      return
    }
    setBusy(true)
    setMessage('')
    const normalized = redirectControls.map((c, i) => ({ ...c, target: targets[i] }))
    const finalHtml = applyButtonRedirects(html, normalized)
    const supabase = createClient()
    const { error: pageError } = await supabase
      .from('funnel_pages')
      .update({ name: cleanName, title: cleanName, slug: clean, html_content: finalHtml })
      .eq('id', selected.id)
    if (pageError) {
      setMessage(pageError.message)
      setBusy(false)
      return
    }
    const { data: latest, error: latestError } = await supabase
      .from('funnel_versions')
      .select('version_number')
      .eq('page_id', selected.id)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (latestError) {
      setMessage(latestError.message)
      setBusy(false)
      return
    }
    const next = (latest?.version_number || 0) + 1
    const { data: v, error } = await supabase
      .from('funnel_versions')
      .insert({
        page_id: selected.id,
        version_number: next,
        html: finalHtml,
        css,
        js,
        metadata: { editor: 'conik', redirects: normalized },
      })
      .select('id,version_number,html,css,js,metadata')
      .single()
    if (error) setMessage(error.message)
    else {
      setVersion(v)
      setHtml(finalHtml)
      setRedirectControls(
        detectRedirectControls(finalHtml).map((d, i) => ({
          ...d,
          target: normalized[i]?.target || d.target || '',
        })),
      )
      setSelected((p) => (p ? { ...p, name: cleanName, slug: clean } : p))
      setPages((ps) => ps.map((p) => (p.id === selected.id ? { ...p, name: cleanName, slug: clean } : p)))
      setMessage(`Version ${next} enregistrée.`)
    }
    setBusy(false)
  }

  async function publish() {
    if (!selected || !version) return
    setBusy(true)
    setMessage('')
    const { error } = await createClient().rpc('publish_funnel_page', {
      target_page: selected.id,
      target_version: version.id,
    })
    if (error) setMessage(error.message)
    else {
      setFunnel((f) => (f ? { ...f, status: 'published' } : f))
      setPages((ps) => ps.map((p) => (p.id === selected.id ? { ...p, published_version_id: version.id } : p)))
      setSelected((p) => (p ? { ...p, published_version_id: version.id } : p))
      setMessage('Page publiée avec succès.')
    }
    setBusy(false)
  }

  async function deletePage() {
    if (!selected || pages.length <= 1) {
      setMessage('Un tunnel doit conserver au moins une page.')
      return
    }
    if (!window.confirm(`Supprimer « ${selected.name} » ? Ses versions seront définitivement supprimées.`)) return
    setBusy(true)
    setMessage('')
    const { error } = await createClient().from('funnel_pages').delete().eq('id', selected.id)
    if (error) setMessage(error.message)
    else {
      const remaining = pages.filter((p) => p.id !== selected.id)
      setPages(remaining)
      await selectPage(remaining[0])
      setMessage('Page supprimée.')
    }
    setBusy(false)
  }

  function pagePublicPath(pageSlug: string) {
    if (!funnel) return ''
    return `/${funnel.slug}/${pageSlug}`
  }

  function pagePublicUrl(pageSlug: string) {
    if (typeof window === 'undefined') return pagePublicPath(pageSlug)
    return `${window.location.origin}${pagePublicPath(pageSlug)}`
  }

  async function copyPageLink() {
    if (!selected || !funnel) return
    const url = pagePublicUrl(selected.slug)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setMessage('Impossible de copier le lien.')
    }
  }

  function setRedirectTarget(index: number, value: string) {
    setRedirectControls((cs) => cs.map((x, n) => (n === index ? { ...x, target: value } : x)))
  }

  function onSelectInternalPage(index: number, pageSlug: string) {
    if (!funnel) return
    if (pageSlug === '__custom__') {
      // garder la valeur actuelle, juste pour basculer en mode libre
      return
    }
    if (pageSlug === '') {
      setRedirectTarget(index, '')
      return
    }
    setRedirectTarget(index, `/${funnel.slug}/${pageSlug}`)
  }

  function isInternalTarget(target: string) {
    if (!funnel || !target.startsWith('/')) return false
    return pages.some((p) => `/${funnel.slug}/${p.slug}` === target)
  }

  function selectedInternalSlug(target: string) {
    if (!funnel || !target.startsWith('/')) return '__custom__'
    const match = pages.find((p) => `/${funnel.slug}/${p.slug}` === target)
    return match ? match.slug : '__custom__'
  }

  const codeValue = activeCodeTab === 'html' ? html : activeCodeTab === 'css' ? css : js
  const setCodeValue = activeCodeTab === 'html' ? setHtml : activeCodeTab === 'css' ? setCss : setJs
  const preview = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${applyButtonRedirects(html, redirectControls)}</body></html>`

  if (!funnel) {
    return (
      <div className="page">
        <p>{message || 'Chargement de l’éditeur de tunnel…'}</p>
      </div>
    )
  }

  return (
    <div className="page">
      <Link href={`/funnels/${funnelId}`} className="back">
        <ArrowLeft size={15} />
        Tunnel
      </Link>

      <div className="head">
        <div>
          <small>ÉDITEUR DE TUNNEL</small>
          <h1>{funnel.name}</h1>
          <p>
            /{funnel.slug} · {funnel.status}
          </p>
        </div>
        <div className="button-row">
          {funnel.status === 'published' && (
            <a className="outline" href={`/${funnel.slug}`} target="_blank" rel="noreferrer">
              <Globe2 size={15} />
              Ouvrir le tunnel
            </a>
          )}
          <button className="primary" onClick={saveVersion} disabled={busy || !selected}>
            <Save size={15} />
            {busy ? 'Enregistrement…' : 'Enregistrer la version'}
          </button>
          <button className="primary" onClick={publish} disabled={busy || !version}>
            <Globe2 size={15} />
            Publier
          </button>
        </div>
      </div>

      {message && <div className="notice">{message}</div>}

      <div className="page-tabs" aria-label="Pages du tunnel">
        <div className="page-tabs-scroll">
          {pages.map((p) => {
            const isSelected = selected?.id === p.id
            return (
              <div key={p.id} className={`page-tab-wrap ${isSelected ? 'active' : ''}`}>
                <button className="page-tab" onClick={() => void selectPage(p)}>
                  <span>Page {p.position + 1}</span>
                  <small>/{p.slug}</small>
                </button>
                <button
                  className="page-visibility"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (isSelected) setShowCode((v) => !v)
                    else void selectPage(p).then(() => setShowCode(false))
                  }}
                  title="Afficher/masquer le code"
                >
                  {isSelected && showCode ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            )
          })}
        </div>
        <button className="page-add page-add-right" onClick={createPage} disabled={busy} title="Ajouter une page">
          <Plus size={18} />
        </button>
      </div>

      <div className={`editor-grid ${showCode ? '' : 'editor-grid-preview-only'}`}>
        {showCode && (
          <section className="panel code-panel">
            <div className="section-head">
              <h3>Page : {selected ? `Page ${selected.position + 1}` : '—'}</h3>
              <div className="button-row editor-actions">
                <label className="outline upload-label import-button" title="Importer un fichier HTML ou ZIP">
                  <UploadCloud size={16} />
                  Importer HTML / ZIP
                  <input
                    ref={htmlInputRef}
                    type="file"
                    accept=".html,.htm,.zip,text/html,application/zip"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void importHtmlOrZip(f)
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
                <label className="outline upload-label import-button" title="Importer un fichier CSS">
                  <FileType2 size={16} />
                  Importer CSS
                  <input
                    ref={cssInputRef}
                    type="file"
                    accept=".css,text/css"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void importTextFile(f, 'css')
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
                <label className="outline upload-label import-button" title="Importer un fichier JavaScript">
                  <FileCode2 size={16} />
                  Importer JavaScript
                  <input
                    ref={jsInputRef}
                    type="file"
                    accept=".js,.mjs,text/javascript,application/javascript"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) void importTextFile(f, 'js')
                      e.currentTarget.value = ''
                    }}
                  />
                </label>
                <button className="danger-button page-delete-button" onClick={() => void deletePage()} disabled={busy || !selected} title="Supprimer la page">
                  <Trash2 size={15} />
                  Supprimer
                </button>
              </div>
            </div>

            {/* Nom + slug + lien public copiable */}
            <div className="field" style={{ marginBottom: 12 }}>
              <span>Nom de la page</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Page de capture" />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <span>Identifiant (slug)</span>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="page-de-capture" />
            </div>

            {selected && (
              <div className="panel" style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--code-bg)', border: '1px solid var(--line)' }}>
                <div className="section-head" style={{ marginBottom: 8 }}>
                  <div>
                    <h4 style={{ margin: 0 }}>Lien public de cette page</h4>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Copiez ce lien pour le coller dans un bouton d’une autre page ou le partager.
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <code style={{ flex: 1, minWidth: 200, fontSize: 13, wordBreak: 'break-all', padding: '8px 10px', background: 'var(--panel)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    {pagePublicUrl(selected.slug)}
                  </code>
                  <button type="button" className="outline" onClick={() => void copyPageLink()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? 'Copié !' : 'Copier'}
                  </button>
                  <a className="outline" href={pagePublicPath(selected.slug)} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Globe2 size={15} />
                    Ouvrir
                  </a>
                </div>
              </div>
            )}

            {/* Redirections avec liste déroulante */}
            <div className="redirect-fields">
              <div className="section-head">
                <div>
                  <h4>Redirections des boutons</h4>
                  <span className="muted">
                    Chaque bouton / lien / input détecté dans le HTML a son propre champ. Choisissez une page du tunnel dans la liste, ou entrez une URL externe.
                  </span>
                </div>
                <span className="muted">{redirectControls.length} élément(s)</span>
              </div>

              {redirectControls.length ? (
                redirectControls.map((c, i) => {
                  const internalSlug = selectedInternalSlug(c.target)
                  const showCustomInput = internalSlug === '__custom__'
                  return (
                    <div className="field redirect-field" key={c.key} style={{ marginBottom: 14 }}>
                      <span>
                        {c.label} <small>({c.tag})</small>
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <select
                          value={internalSlug}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === '__custom__') {
                              // bascule en mode libre sans effacer si déjà une URL externe
                              if (isInternalTarget(c.target)) setRedirectTarget(i, '')
                            } else {
                              onSelectInternalPage(i, val)
                            }
                          }}
                          style={{ width: '100%' }}
                        >
                          <option value="">— Aucune redirection —</option>
                          {pages
                            .filter((p) => p.id !== selected?.id)
                            .map((p) => (
                              <option key={p.id} value={p.slug}>
                                Page {p.position + 1} — {p.name} (/{p.slug})
                              </option>
                            ))}
                          <option value="__custom__">URL personnalisée / externe…</option>
                        </select>

                        {showCustomInput && (
                          <input
                            value={c.target}
                            onChange={(e) => setRedirectTarget(i, e.target.value)}
                            placeholder="https://exemple.com ou /mon-chemin"
                          />
                        )}

                        {!showCustomInput && c.target && (
                          <span className="muted" style={{ fontSize: 12 }}>
                            → {c.target}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="muted">Aucun bouton, lien ou input détecté dans cette page.</div>
              )}
            </div>

            <div className="code-tabs">
              <button className={activeCodeTab === 'html' ? 'active' : ''} onClick={() => setActiveCodeTab('html')}>
                HTML
              </button>
              <button className={activeCodeTab === 'css' ? 'active' : ''} onClick={() => setActiveCodeTab('css')}>
                CSS
              </button>
              <button className={activeCodeTab === 'js' ? 'active' : ''} onClick={() => setActiveCodeTab('js')}>
                JavaScript
              </button>
            </div>

            <textarea
              className="code-editor"
              value={codeValue}
              onChange={(e) => {
                setCodeValue(e.target.value)
                if (activeCodeTab === 'html') {
                  const detected = detectRedirectControls(e.target.value)
                  setRedirectControls(
                    detected.map((d, i) => ({
                      ...d,
                      target: redirectControls[i]?.target || d.target || '',
                    })),
                  )
                }
              }}
              spellCheck={false}
            />
          </section>
        )}

        <section className="panel preview-panel">
          <div className="section-head">
            <h3>Aperçu</h3>
            <span className="muted">Page {selected ? selected.position + 1 : '—'}</span>
          </div>
          <iframe
            title="Aperçu de la page"
            sandbox="allow-scripts allow-forms"
            srcDoc={preview}
            style={{ width: '100%', minHeight: 650, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }}
          />
        </section>
      </div>
    </div>
  )
}
