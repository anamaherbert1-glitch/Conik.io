'use client'

import Link from 'next/link'
import { ArrowLeft, Check, Copy, Eye, EyeOff, FileCode2, FileType2, Globe2, ImageIcon, Plus, Save, Trash2, UploadCloud } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CodeEditor } from '@/components/code-editor'

type Page = { id: string; name: string; slug: string; page_type: string; position: number; published_version_id: string | null }
type Version = { id: string; version_number: number; html: string; css: string; js: string; metadata: Record<string, unknown> }
type CodeTab = 'html' | 'css' | 'js'
type RedirectControl = { key: string; tag: string; label: string; target: string; existing: boolean; actionType: 'url' | 'onclick' | 'none' }

const DEFAULT_HTML = '<main style="font-family:system-ui;max-width:900px;margin:80px auto;padding:24px"><h1>Votre tunnel commence ici</h1><p>Importez votre HTML, CSS ou JavaScript.</p><a href="#cta" id="cta">Commencer</a></main>'
const DEFAULT_CSS = 'body{margin:0;background:#fff;color:#111827}a{font-weight:700;color:#ea580c}'

function cleanSlug(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) }
function safeRedirect(value: string) { const v = value.trim(); if (!v) return ''; if (v.startsWith('/')) return v; try { const u = new URL(v); if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString() } catch {} return '' }
function escapeAttr(value: string) { return value.replace(/&/g, '&').replace(/"/g, '"').replace(/</g, '<').replace(/>/g, '>') }
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
    const MAX_BYTES = 25 * 1024 * 1024
    if (file.size <= 0 || file.size > MAX_BYTES) {
      setMessage(`Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 25 Mo.`)
      return
    }
    setBusy(true)
    setMessage(`Préparation de l'envoi… 0 %`)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expirée. Reconnectez-vous.')
      const { data: member, error: memErr } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).maybeSingle()
      if (memErr) throw new Error(memErr.message)
      if (!member?.organization_id) throw new Error('Espace de travail introuvable.')
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Session expirée. Reconnectez-vous.')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || 'upload.zip'
      const storagePath = `${member.organization_id}/import-temp/${crypto.randomUUID()}-${safeName}`
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ndsksabyzxfmhnyykcfb.supabase.co'
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_-adOy-Xd9Xuqugx74Cjklg_CV9EzTfF'
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${supabaseUrl}/storage/v1/object/funnel-assets/${storagePath}`)
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.setRequestHeader('apikey', anonKey)
        xhr.setRequestHeader('x-upsert', 'true')
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return
          const pct = Math.min(99, Math.round((e.loaded / e.total) * 100))
          setMessage(`Téléversement… ${pct} % · ${(e.loaded / 1024 / 1024).toFixed(1)} / ${(e.total / 1024 / 1024).toFixed(1)} Mo`)
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else {
            let msg = `Échec de l'envoi (${xhr.status}).`
            try { const j = JSON.parse(xhr.responseText); if (j?.message || j?.error) msg = j.message || j.error } catch {}
            reject(new Error(msg))
          }
        }
        xhr.onerror = () => reject(new Error('Réseau interrompu pendant l\'envoi.'))
        xhr.ontimeout = () => reject(new Error('Délai dépassé pendant l\'envoi.'))
        xhr.timeout = 180000
        xhr.send(file)
      })
      setMessage('Analyse et import sur le serveur…')
      const body = new FormData()
      body.append('pageId', selected.id)
      body.append('storagePath', storagePath)
      body.append('fileName', file.name)
      const response = await fetch('/api/funnels/pages/import', { method: 'POST', body })
      const textRes = await response.text()
      let data: any = {}
      try { data = textRes ? JSON.parse(textRes) : {} } catch {
        throw new Error(textRes.replace(/<[^>]+>/g, ' ').trim().slice(0, 200) || `Erreur serveur (${response.status}).`)
      }
      if (!response.ok) throw new Error(data.error || data.message || 'Import impossible.')
      setVersion(data.version)
      setHtml(data.version.html)
      setCss(data.version.css)
      setJs(data.version.js)
      setName(data.page.name)
      const detected = detectRedirectControls(data.version.html)
      setRedirectControls(detected)
      setSelectedControl(null)
      setActiveCodeTab('html')
      setShowCode(true)
      const unconfigured = detected.filter((d) => !d.existing).length
      setMessage(`Import terminé · ${data.assets ?? 0} asset(s) · ${detected.length} bouton(s)/lien(s) détecté(s)${unconfigured ? ` · ${unconfigured} à configurer` : ''}. Publication automatique…`)
      try {
        const pub = await fetch('/api/funnels/pages/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId: selected.id, versionId: data.version.id }),
        })
        const pubText = await pub.text()
        let pubData: any = {}
        try { pubData = pubText ? JSON.parse(pubText) : {} } catch {}
        if (!pub.ok) throw new Error(pubData.error || 'Publication automatique échouée.')
        setFunnel((f) => (f ? { ...f, status: 'published' } : f))
        setPages((ps) => ps.map((p) => (p.id === selected.id ? { ...p, published_version_id: data.version.id } : p)))
        setSelected((p) => (p ? { ...p, published_version_id: data.version.id } : p))
        setMessage(`Import + publication réussis · ${data.assets ?? 0} asset(s) · ${detected.length} élément(s) interactif(s). Ouvrez le tunnel.`)
      } catch (pubErr) {
        setMessage(`Import OK. Cliquez sur Publier (sans Enregistrer) : ${pubErr instanceof Error ? pubErr.message : 'erreur'}`)
      }
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
      setMessage(`${kind.toUpperCase()} importé.`)
    } catch { setMessage('Import impossible.') } finally { setBusy(false) }
  }

  async function saveVersion() {
    if (!selected) return
    if (version && (html.length + css.length + js.length) > 400000) {
      setMessage('Page volumineuse déjà importée. Configurez les boutons si besoin, puis Publier (pas besoin d\'Enregistrer pour le gros HTML).')
      setBusy(false)
      return
    }
    setBusy(true)
    setMessage('Enregistrement…')
    try {
      const finalHtml = applyButtonRedirects(html, redirectControls)
      const normalized = redirectControls.filter((c) => c.target).map((c) => ({ key: c.key, target: safeRedirect(c.target) || c.target }))
      const response = await fetch('/api/funnels/pages/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: selected.id,
          html: finalHtml,
          css,
          js,
          redirects: normalized,
          ...(shareImageUrl ? { shareImageUrl } : {}),
        }),
      })
      const textRes = await response.text()
      let data: any = {}
      try { data = textRes ? JSON.parse(textRes) : {} } catch {
        throw new Error(textRes.slice(0, 180) || `Erreur serveur (${response.status}).`)
      }
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.')
      setVersion(data.version)
      setHtml(data.version.html)
      setCss(data.version.css)
      setJs(data.version.js)
      setMessage(`Version ${data.version.version_number} enregistrée.`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Enregistrement impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function publish() {
    if (!selected || !version) {
      setMessage('Aucune version à publier. Importez d\'abord un fichier.')
      return
    }
    setBusy(true)
    setMessage('Publication en cours…')
    try {
      // Apply button redirects into HTML before publish when content is small enough to re-save
      const finalHtml = applyButtonRedirects(html, redirectControls)
      const needsRedirectApply = redirectControls.some((c) => c.target) && finalHtml !== html
      let versionId = version.id
      if (needsRedirectApply && (finalHtml.length + css.length + js.length) <= 400000) {
        const normalized = redirectControls.filter((c) => c.target).map((c) => ({ key: c.key, target: safeRedirect(c.target) || c.target }))
        const saveRes = await fetch('/api/funnels/pages/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId: selected.id, html: finalHtml, css, js, redirects: normalized, ...(shareImageUrl ? { shareImageUrl } : {}) }),
        })
        const saveText = await saveRes.text()
        let saveData: any = {}
        try { saveData = saveText ? JSON.parse(saveText) : {} } catch {}
        if (saveRes.ok && saveData.version?.id) {
          setVersion(saveData.version)
          setHtml(saveData.version.html)
          versionId = saveData.version.id
        }
      }
      const response = await fetch('/api/funnels/pages/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: selected.id, versionId }),
      })
      const textRes = await response.text()
      let data: any = {}
      try { data = textRes ? JSON.parse(textRes) : {} } catch {
        throw new Error(textRes.slice(0, 180) || `Erreur serveur (${response.status}).`)
      }
      if (!response.ok) throw new Error(data.error || 'Publication impossible.')
      setFunnel((f) => (f ? { ...f, status: 'published' } : f))
      setPages((ps) => ps.map((p) => (p.id === selected.id ? { ...p, published_version_id: versionId } : p)))
      setSelected((p) => (p ? { ...p, published_version_id: versionId } : p))
      setMessage('Page publiée avec succès. Ouvrez le tunnel.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Publication impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function deletePage() {
    if (!selected || pages.length <= 1) { setMessage('Un tunnel doit conserver au moins une page.'); return }
    if (!window.confirm(`Supprimer « ${selected.name} » ?`)) return
    setBusy(true); setMessage('')
    const { error } = await createClient().from('funnel_pages').delete().eq('id', selected.id)
    if (error) setMessage(error.message)
    else { const remaining = pages.filter((p) => p.id !== selected.id); setPages(remaining); await selectPage(remaining[0]); setMessage('Page supprimée.') }
    setBusy(false)
  }

  function pagePublicPath(pageSlug: string) { return funnel ? `/${funnel.slug}/${pageSlug}` : '' }
  function pagePublicUrl(pageSlug: string) { return typeof window === 'undefined' ? pagePublicPath(pageSlug) : `${window.location.origin}${pagePublicPath(pageSlug)}` }
  async function copyPageLink() { if (!selected || !funnel) return; try { await navigator.clipboard.writeText(pagePublicUrl(selected.slug)); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { setMessage('Impossible de copier le lien.') } }

  function setRedirectTarget(index: number, value: string) { setRedirectControls((cs) => cs.map((x, n) => n === index ? { ...x, target: value, existing: Boolean(value.trim()), actionType: value.trim() ? 'url' : 'none' } : x)) }
  function onSelectInternalPage(index: number, pageSlug: string) { if (!funnel) return; if (pageSlug === '__custom__') return; setRedirectTarget(index, pageSlug ? `/${funnel.slug}/${pageSlug}` : '') }
  function selectedInternalSlug(target: string) { if (!funnel || !target.startsWith('/')) return '__custom__'; const match = pages.find((p) => `/${funnel.slug}/${p.slug}` === target); return match ? match.slug : '__custom__' }
  const codeValue = activeCodeTab === 'html' ? html : activeCodeTab === 'css' ? css : js, setCodeValue = activeCodeTab === 'html' ? setHtml : activeCodeTab === 'css' ? setCss : setJs
  const preview = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`

  if (!funnel) return <div className="page"><p>{message || 'Chargement de l\'éditeur…'}</p></div>

  return (
    <div className="page">
      <Link href={`/funnels/${funnelId}`} className="back"><ArrowLeft size={15} /> Tunnel</Link>
      <div className="head">
        <div>
          <small>ÉDITEUR DE TUNNEL</small>
          <h1>{funnel.name}</h1>
          <p className="muted">/{funnel.slug} · {funnel.status}</p>
        </div>
        <div className="button-row">
          <a className="outline" href={`/${funnel.slug}`} target="_blank" rel="noreferrer"><Globe2 size={15} /> Ouvrir le tunnel</a>
          <button className="primary" onClick={() => void saveVersion()} disabled={busy || !selected}><Save size={15} /> Enregistrer</button>
          <button className="primary" onClick={() => void publish()} disabled={busy || !selected || !version}>Publier</button>
        </div>
      </div>
      {message && <div className="notice">{message}</div>}

      <div className="page-tabs">
        <div className="page-tabs-scroll">
          {pages.map((p) => (
            <div key={p.id} className="page-tab-wrap">
              <button className={`page-tab${selected?.id === p.id ? ' active' : ''}`} onClick={() => void selectPage(p)}>
                Page {p.position + 1}<small>/{p.slug}</small>
              </button>
              <span className="page-visibility">{p.published_version_id ? '●' : '○'}</span>
            </div>
          ))}
          <button className="page-add page-add-right" onClick={() => void createPage()} disabled={busy}><Plus size={16} /></button>
        </div>
      </div>

      <div className="editor-workspace">
        <aside className="panel editor-sidebar">
          <div className="editor-sidebar-head">
            <div><small>PAGE</small><h3>Structure</h3></div>
            <button className="outline" onClick={() => void createPage()} disabled={busy}><Plus size={14} /> Ajouter</button>
          </div>
          <div className="editor-page-list">
            {pages.map((p) => (
              <button key={p.id} className={`editor-page-item${selected?.id === p.id ? ' active' : ''}`} onClick={() => void selectPage(p)}>
                <span><b>Page {p.position + 1}</b><small>/{p.slug}</small></span>
                <span className="editor-page-status">{p.published_version_id ? 'Publié' : 'Brouillon'}</span>
              </button>
            ))}
          </div>
          <div className="editor-sidebar-section">
            <small>CONFIGURATION</small>
            <div className="editor-config-card">
              <div><span>Page</span><b>{selected?.name || '—'}</b></div>
              <div><span>URL</span><code>{selected ? pagePublicPath(selected.slug) : '—'}</code></div>
              <div><span>État</span><b>{selected?.published_version_id ? 'Publié' : 'Brouillon'}</b></div>
            </div>
          </div>
        </aside>

        <section className="panel preview-panel">
          <div className="section-head">
            <h3>Aperçu</h3>
            <div className="button-row" style={{ gap: 8 }}>
              <span className="muted">Page {selected ? selected.position + 1 : '—'}</span>
              <button type="button" className="outline" onClick={() => setShowCode((s) => !s)} disabled={!selected}>
                {showCode ? <><EyeOff size={14} /> Masquer le code</> : <><Eye size={14} /> Afficher le code</>}
              </button>
            </div>
          </div>
          <iframe title="Aperçu" className="preview-frame" sandbox="allow-scripts allow-forms" srcDoc={preview} style={{ width: '100%', minHeight: 650, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }} />
        </section>

        {selected && showCode && (
          <section className="panel code-panel">
            <div className="code-panel-header">
              <div>
                <small>ÉDITEUR</small>
                <h3>Code & configuration</h3>
                <p className="muted">Gérez le contenu, les fichiers et les redirections depuis un seul espace.</p>
              </div>
              <div className="button-row editor-actions">
                <label className="outline upload-label import-button"><UploadCloud size={16} />Importer HTML / ZIP
                  <input ref={htmlInputRef} type="file" accept=".html,.htm,.zip,text/html,application/zip" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importHtmlOrZip(f); e.currentTarget.value = '' }} />
                </label>
                <label className="outline upload-label import-button"><FileType2 size={16} />CSS
                  <input ref={cssInputRef} type="file" accept=".css,text/css" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importTextFile(f, 'css'); e.currentTarget.value = '' }} />
                </label>
                <label className="outline upload-label import-button"><FileCode2 size={16} />JS
                  <input ref={jsInputRef} type="file" accept=".js,.mjs,text/javascript" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importTextFile(f, 'js'); e.currentTarget.value = '' }} />
                </label>
                <button className="danger-button page-delete-button" onClick={() => void deletePage()} disabled={busy}><Trash2 size={15} /></button>
              </div>
            </div>
            <div className="code-toolbar">
              <div className="code-page-meta"><span>Page {selected.position + 1}</span><code>{pagePublicUrl(selected.slug)}</code></div>
              <div className="button-row">
                <button className="outline" onClick={() => void copyPageLink()}>{copied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier le lien</>}</button>
              </div>
            </div>
            <div className="field" style={{ display: 'none' }}>
              <div className="button-row">
                <code style={{ flex: 1, fontSize: 12 }}>{pagePublicUrl(selected.slug)}</code>
                <button className="outline" onClick={() => void copyPageLink()}>{copied ? <><Check size={14} /> Copié</> : <><Copy size={14} /> Copier</>}</button>
              </div>
            </div>
            <div className="code-tabs">
              <button className={activeCodeTab === 'html' ? 'active' : ''} onClick={() => setActiveCodeTab('html')}>HTML</button>
              <button className={activeCodeTab === 'css' ? 'active' : ''} onClick={() => setActiveCodeTab('css')}>CSS</button>
              <button className={activeCodeTab === 'js' ? 'active' : ''} onClick={() => setActiveCodeTab('js')}>JS</button>
            </div>
            <CodeEditor
              language={activeCodeTab === 'js' ? 'js' : activeCodeTab}
              value={codeValue}
              onChange={(next) => {
                setCodeValue(next)
                if (activeCodeTab === 'html') {
                  const detected = detectRedirectControls(next)
                  setRedirectControls(
                    detected.map((d, i) => ({
                      ...d,
                      target: redirectControls[i]?.target || d.target || '',
                      existing: Boolean(redirectControls[i]?.target || d.existing || d.target),
                    })),
                  )
                }
              }}
            />

            <div className="field redirect-field" style={{ margin: '16px 18px 20px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 14 }}>Redirections des boutons</h4>
              <p className="muted" style={{ margin: '0 0 12px', fontSize: 12 }}>
                Conik détecte automatiquement les boutons et liens. Configurez ici ceux qui n’ont pas encore de destination.
              </p>
              {redirectControls.length ? (
                redirectControls.map((c, i) => {
                  const internalSlug = selectedInternalSlug(c.target)
                  const custom = internalSlug === '__custom__'
                  return (
                    <div
                      key={c.key}
                      className="redirect-fields"
                      style={{
                        marginBottom: 10,
                        padding: 12,
                        border: '1px solid #e5e7eb',
                        borderRadius: 10,
                        background: c.existing ? '#f8fafc' : '#fff7ed',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {c.label}{' '}
                          <small style={{ fontWeight: 400, color: '#6b7280' }}>({c.tag})</small>
                        </span>
                        <strong style={{ fontSize: 11, color: c.existing ? '#15803d' : '#c2410c' }}>
                          {c.existing ? 'Configuré' : 'À configurer'}
                        </strong>
                      </div>
                      <select
                        value={internalSlug}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '__custom__') {
                            if (c.target && internalSlug !== '__custom__') setRedirectTarget(i, '')
                          } else {
                            onSelectInternalPage(i, val)
                          }
                        }}
                        style={{ width: '100%', marginBottom: 8, padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db' }}
                      >
                        <option value="">— Aucune —</option>
                        {pages
                          .filter((p) => p.id !== selected?.id)
                          .map((p) => (
                            <option key={p.id} value={p.slug}>
                              Page {p.position + 1} — {p.name} (/{p.slug})
                            </option>
                          ))}
                        <option value="__custom__">URL personnalisée…</option>
                      </select>
                      {custom && (
                        <input
                          value={c.target}
                          onChange={(e) => setRedirectTarget(i, e.target.value)}
                          placeholder="https://exemple.com ou /chemin"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                        />
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="muted" style={{ fontSize: 12 }}>
                  Aucun bouton ou lien interactif détecté sur cette page.
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
