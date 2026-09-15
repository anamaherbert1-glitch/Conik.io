'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  FileCode2,
  FileType2,
  Info,
  Link2,
  Monitor,
  Save,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type Capture = {
  id: string
  name: string
  slug: string
  capture_enabled: boolean
  capture_delay_ms: number
  capture_html: string | null
  capture_css: string | null
  capture_js: string | null
}
type ButtonItem = { index: number; label: string; href: string; tag: string }
type FunnelPage = {
  id: string
  name: string
  slug: string
  page_type: string
  position: number
  published_version_id: string | null
}

function detectButtons(html: string): ButtonItem[] {
  if (typeof window === 'undefined' || !html.trim()) return []
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return Array.from(
    doc.querySelectorAll('a,button,input[type="button"],input[type="submit"]'),
  ).map((el, index) => ({
    index,
    label:
      (el.textContent || el.getAttribute('value') || el.getAttribute('aria-label') || '')
        .trim()
        .replace(/\s+/g, ' ') || `Bouton ${index + 1}`,
    href: el.getAttribute('href') || el.getAttribute('data-conik-redirect') || '',
    tag: el.tagName.toLowerCase(),
  }))
}

function applyButtonLinks(html: string, items: ButtonItem[]) {
  if (typeof window === 'undefined' || !html.trim()) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const nodes = Array.from(
    doc.querySelectorAll('a,button,input[type="button"],input[type="submit"]'),
  )
  items.forEach((item, index) => {
    const el = nodes[index]
    const href = item.href.trim()
    if (!el || !href) return
    if (el.tagName.toLowerCase() === 'a') el.setAttribute('href', href)
    else {
      el.setAttribute('type', 'button')
      el.setAttribute('data-conik-redirect', href)
      el.setAttribute('onclick', `window.location.href=${JSON.stringify(href)}`)
    }
  })
  return doc.body.innerHTML
}

function validRedirect(value: string) {
  const href = value.trim()
  return href === '' || href.startsWith('/') || /^https?:\/\//i.test(href)
}

export default function CapturePage({ params }: { params: Promise<{ id: string }> }) {
  const [funnelId, setFunnelId] = useState('')
  const [capture, setCapture] = useState<Capture | null>(null)
  const [pages, setPages] = useState<FunnelPage[]>([])
  const [enabled, setEnabled] = useState(false)
  const [delay, setDelay] = useState(5)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [buttons, setButtons] = useState<ButtonItem[]>([])

  useEffect(() => {
    params.then((p) => setFunnelId(p.id))
  }, [params])

  async function load() {
    if (!funnelId) return
    const r = await fetch(`/api/funnels/capture-page?funnelId=${encodeURIComponent(funnelId)}`)
    const j = await r.json()
    if (!r.ok) {
      setError(j.error || 'Chargement impossible.')
      return
    }
    setCapture(j.capture)
    setPages(j.pages || [])
    setEnabled(Boolean(j.capture.capture_enabled))
    setDelay(Math.max(1, Math.min(60, Math.round((j.capture.capture_delay_ms || 5000) / 1000))))
    setButtons(detectButtons(j.capture.capture_html || ''))
  }
  useEffect(() => {
    void load()
  }, [funnelId])

  function updateButton(index: number, href: string) {
    setButtons((current) => current.map((b, i) => (i === index ? { ...b, href } : b)))
  }

  async function save(files?: File[]) {
    if (!funnelId) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      let activeButtons = buttons
      let finalHtml = capture?.capture_html || ''

      if (!files?.length) {
        activeButtons = buttons.length ? buttons : detectButtons(finalHtml)
        const invalid = activeButtons.find((item) => !validRedirect(item.href))
        if (invalid) {
          throw new Error(
            `Redirection invalide pour « ${invalid.label} ». Utilisez une URL https:// ou un chemin interne /...`,
          )
        }
        finalHtml = applyButtonLinks(finalHtml, activeButtons)
      }

      const body = new FormData()
      body.append('funnelId', funnelId)
      body.append('enabled', String(enabled))
      body.append('delayMs', String(Math.min(60, Math.max(1, Number(delay) || 1)) * 1000))

      if (files?.length) {
        // Envoyer tous les fichiers (HTML, CSS, JS, ZIP) séparément au serveur
        files.forEach((file, i) => {
          body.append(i === 0 ? 'file' : `file_${i}`, file)
        })
      } else if (finalHtml.trim()) {
        // Réenregistrer HTML modifié (redirections) en gardant CSS/JS côté serveur
        // On envoie seulement le HTML body ; le serveur ne touche pas CSS/JS si on
        // les renvoie aussi via les champs existants — en pratique on envoie le HTML
        // et le serveur met à jour capture_html + conserve les colonnes si on les
        // réinjecte. Pour simplifier: on envoie un HTML qui contient déjà les styles
        // et scripts stockés.
        const full = `<!doctype html><html><head><style>${capture?.capture_css || ''}</style></head><body>${finalHtml}<script>${capture?.capture_js || ''}</script></body></html>`
        body.append('file', new File([full], 'capture.html', { type: 'text/html' }))
      }

      const r = await fetch('/api/funnels/capture-page', { method: 'POST', body })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Enregistrement impossible.')

      setCapture(j.capture)
      setButtons(detectButtons(j.capture.capture_html || ''))

      const cssOk = (j.capture.capture_css || '').length > 0
      const jsOk = (j.capture.capture_js || '').length > 0
      if (files?.length) {
        setMessage(
          `Import réussi · HTML${cssOk ? ' + CSS' : ''}${jsOk ? ' + JavaScript' : ''} enregistrés${
            j.analysis ? ` (${j.analysis.cssBytes || 0} o CSS, ${j.analysis.jsBytes || 0} o JS)` : ''
          }.`,
        )
      } else {
        setMessage('Configuration de la page de capture enregistrée.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function removeCapture() {
    if (!funnelId || !window.confirm('Supprimer la page de capture de ce tunnel ?')) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const r = await fetch(`/api/funnels/capture-page?funnelId=${encodeURIComponent(funnelId)}`, {
        method: 'DELETE',
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Suppression impossible.')
      setCapture(j.capture)
      setEnabled(false)
      setButtons([])
      setMessage('Page de capture supprimée du tunnel.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible.')
    } finally {
      setBusy(false)
    }
  }

  const preview = useMemo(() => {
    if (!capture?.capture_html) return ''
    const css = capture.capture_css || ''
    const js = capture.capture_js || ''
    // Split closing script tag to avoid any parser issues
    return (
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      `<style>${css}</style></head><body>${capture.capture_html}` +
      `<script>${js}<` +
      '/script></body></html>'
    )
  }, [capture])

  const firstPageIndex = pages.length
    ? pages.reduce((best, page, index) => (page.position < pages[best].position ? index : best), 0)
    : 0

  const hasCss = Boolean(capture?.capture_css?.trim())
  const hasJs = Boolean(capture?.capture_js?.trim())

  return (
    <div className="capture-workspace">
      <Link href={`/funnels/${funnelId}`} className="back">
        <ArrowLeft size={15} />
        Tunnel
      </Link>

      <div className="capture-topbar">
        <div className="capture-title">
          <span className="capture-kicker">PAGE DE CAPTURE</span>
          <div className="capture-title-row">
            <h1>{capture?.name || 'Page de capture'}</h1>
            <span className={`capture-status ${enabled && capture?.capture_html ? 'is-on' : ''}`}>
              <span />
              {enabled && capture?.capture_html ? 'Activée' : 'Non configurée'}
            </span>
          </div>
          <p>Importez votre HTML, CSS et JavaScript — ils seront tous exécutés sur la page de capture.</p>
        </div>
        <div className="capture-actions">
          <Link className="outline" href={`/funnels/${funnelId}/editor`}>
            <Eye size={15} />
            Éditeur
          </Link>
          <button className="primary" onClick={() => void save()} disabled={busy || !capture}>
            <Save size={15} />
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {message && (
        <div className="capture-alert success">
          <CheckCircle2 size={17} />
          {message}
        </div>
      )}
      {error && (
        <div className="capture-alert error">
          <X size={17} />
          {error}
        </div>
      )}

      <div className="capture-tabs">
        <Link href={`/funnels/${funnelId}/editor`}>
          <Monitor size={15} />
          Pages
        </Link>
        <span className="active">
          <UploadCloud size={15} />
          Page de capture
        </span>
        <span>
          <Link2 size={15} />
          Redirections
        </span>
        <span>
          <CheckCircle2 size={15} />
          Publication
        </span>
      </div>

      <div className="capture-layout">
        <main className="capture-main">
          <section className="capture-card">
            <div className="capture-card-heading">
              <div className="heading-icon">
                <UploadCloud size={19} />
              </div>
              <div>
                <h2>Importer la page de capture</h2>
                <p>
                  Sélectionnez un fichier <b>HTML</b>, et éventuellement les fichiers <b>CSS</b> et{' '}
                  <b>JavaScript</b> en même temps. Vous pouvez aussi importer un <b>ZIP</b> complet
                  (HTML + CSS + JS + images).
                </p>
              </div>
            </div>

            <div className="capture-import-row">
              <label className="capture-upload-button">
                <UploadCloud size={17} />
                Importer HTML + CSS + JS (ou ZIP)
                <input
                  type="file"
                  accept=".html,.htm,.css,.js,.zip,text/html,text/css,application/javascript,application/zip"
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length) void save(files)
                    e.currentTarget.value = ''
                  }}
                />
              </label>

              <div className="capture-file-state">
                <div className="file-icon">WEB</div>
                <div>
                  <b>{capture?.capture_html ? 'Page enregistrée' : 'Aucun fichier importé'}</b>
                  <small>
                    {capture?.capture_html
                      ? [
                          'HTML',
                          hasCss ? 'CSS' : null,
                          hasJs ? 'JavaScript' : null,
                        ]
                          .filter(Boolean)
                          .join(' + ')
                      : 'HTML requis · CSS et JS recommandés'}
                  </small>
                </div>
                {capture?.capture_html && <CheckCircle2 size={17} className="file-ok" />}
              </div>
            </div>

            {capture?.capture_html && (
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginTop: 12,
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'var(--notice-bg, #ecfdf5)',
                    color: 'var(--notice-text, #047857)',
                  }}
                >
                  <FileType2 size={14} /> HTML OK
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: hasCss ? 'var(--notice-bg, #ecfdf5)' : 'var(--code-bg, #f5f5f5)',
                    color: hasCss ? 'var(--notice-text, #047857)' : 'var(--muted)',
                  }}
                >
                  <FileType2 size={14} /> CSS {hasCss ? 'OK' : 'absent'}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: hasJs ? 'var(--notice-bg, #ecfdf5)' : 'var(--code-bg, #f5f5f5)',
                    color: hasJs ? 'var(--notice-text, #047857)' : 'var(--muted)',
                  }}
                >
                  <FileCode2 size={14} /> JS {hasJs ? 'OK' : 'absent'}
                </span>
              </div>
            )}
          </section>

          <section className="capture-card">
            <div className="capture-card-heading compact">
              <div className="heading-icon">
                <Clock3 size={19} />
              </div>
              <div>
                <h2>Configuration d’affichage</h2>
                <p>La capture apparaît uniquement sur la première page et une seule fois par session.</p>
              </div>
            </div>
            <div className="capture-settings-grid">
              <label className="capture-field">
                <span>Délai d’apparition</span>
                <div className="select-wrap">
                  <select
                    value={delay}
                    onChange={(e) => setDelay(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                  >
                    {[1, 2, 3, 4, 5, 10, 15, 20, 30, 45, 60].map((v) => (
                      <option key={v} value={v}>
                        {v} seconde{v > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label className="capture-toggle-field">
                <span>Page de capture activée</span>
                <button
                  type="button"
                  className={`capture-toggle ${enabled ? 'on' : ''}`}
                  onClick={() => setEnabled((v) => !v)}
                  aria-pressed={enabled}
                >
                  <span />
                </button>
              </label>
            </div>
          </section>

          <section className="capture-card preview-card">
            <div className="capture-card-heading compact">
              <div className="heading-icon">
                <Eye size={19} />
              </div>
              <div>
                <h2>Aperçu de la page de capture</h2>
                <p>Le HTML, le CSS et le JavaScript importés sont chargés et exécutés dans cet aperçu.</p>
              </div>
            </div>
            <div className="capture-preview-grid">
              <div className="capture-preview-frame-wrap">
                {preview ? (
                  <iframe
                    title="Aperçu page de capture"
                    sandbox="allow-scripts allow-forms"
                    srcDoc={preview}
                    className="capture-preview-frame"
                  />
                ) : (
                  <div className="capture-empty-preview">
                    <UploadCloud size={28} />
                    <b>Aucun aperçu disponible</b>
                    <span>Importez votre page (HTML + CSS + JS).</span>
                  </div>
                )}
              </div>
              <div className="redirect-list">
                <div className="redirect-list-heading">
                  <div>
                    <h3>Boutons et liens détectés</h3>
                    <span>
                      {buttons.length} élément{buttons.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <Link2 size={18} />
                </div>
                <p className="redirect-help">
                  Configurez une redirection pour chaque bouton ou lien trouvé dans votre HTML.
                </p>
                {buttons.length ? (
                  buttons.map((b, i) => (
                    <div className="redirect-item" key={`${b.index}-${i}`}>
                      <div className="redirect-number">{i + 1}</div>
                      <div className="redirect-control">
                        <b>{b.label}</b>
                        <div className="redirect-input">
                          <input
                            value={b.href}
                            placeholder="https://exemple.com ou /merci"
                            onChange={(e) => updateButton(i, e.target.value)}
                          />
                          <Link2 size={15} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="redirect-empty">Aucun bouton ou lien détecté.</div>
                )}
                {buttons.length > 0 && (
                  <button
                    className="primary capture-save-redirects"
                    onClick={() => void save()}
                    disabled={busy}
                  >
                    <Save size={15} />
                    Enregistrer les redirections
                  </button>
                )}
              </div>
            </div>
          </section>

          {capture?.capture_html && (
            <div className="capture-info">
              <Info size={17} />
              <span>
                La page de capture sera affichée uniquement sur la première page du tunnel, après le
                délai configuré, et une seule fois par session. CSS et JavaScript sont bien exécutés.
              </span>
            </div>
          )}

          <div className="capture-bottom-actions">
            <button
              className="danger-button"
              onClick={() => void removeCapture()}
              disabled={busy || !capture?.capture_html}
            >
              <Trash2 size={15} />
              Supprimer
            </button>
            <button className="primary" onClick={() => void save()} disabled={busy || !capture}>
              <Save size={15} />
              {busy ? 'Enregistrement…' : 'Sauvegarder'}
            </button>
          </div>
        </main>

        <aside className="capture-side">
          <section className="capture-card side-card">
            <div className="side-heading">
              <div>
                <h2>Aperçu du tunnel</h2>
                <p>Voici comment la page de capture s’affichera dans votre tunnel.</p>
              </div>
            </div>
            <div className="funnel-steps">
              {(pages.length
                ? pages
                : [
                    {
                      id: 'capture',
                      name: 'Page 1',
                      slug: 'home',
                      page_type: 'landing',
                      position: 0,
                      published_version_id: null,
                    },
                  ]
              )
                .slice(0, 8)
                .map((page, index) => (
                  <div
                    className={`funnel-step ${index === firstPageIndex ? 'active' : ''}`}
                    key={page.id}
                  >
                    <div className="step-dot">{index + 1}</div>
                    <b>{page.name || `Page ${index + 1}`}</b>
                    <small>{index === firstPageIndex ? '(Avec capture)' : '(Sans capture)'}</small>
                  </div>
                ))}
            </div>
            <div className="side-preview">
              <div className="browser-bar">
                <span />
                <span />
                <span />
                <b>⋯</b>
              </div>
              {preview ? (
                <iframe title="Aperçu du tunnel" sandbox="allow-scripts allow-forms" srcDoc={preview} />
              ) : (
                <div className="side-empty">
                  <UploadCloud size={25} />
                  <span>Importez votre capture pour la prévisualiser.</span>
                </div>
              )}
            </div>
          </section>

          <section className="capture-card side-card functionality-card">
            <div className="side-heading">
              <div className="heading-icon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2>Fonctionnement</h2>
                <p>Le comportement est géré automatiquement.</p>
              </div>
            </div>
            <ol>
              <li>Le visiteur arrive sur la première page du tunnel.</li>
              <li>
                Après {delay} seconde{delay > 1 ? 's' : ''}, la page de capture apparaît.
              </li>
              <li>Le HTML, le CSS et le JavaScript sont tous exécutés.</li>
              <li>Le formulaire peut envoyer le contact dans le CRM.</li>
              <li>La capture ne réapparaît plus pendant cette session.</li>
            </ol>
          </section>

          <div className={`capture-ready ${enabled && capture?.capture_html ? 'ready' : ''}`}>
            <CheckCircle2 size={18} />
            <div>
              <b>
                {enabled && capture?.capture_html
                  ? 'Capture correctement configurée'
                  : 'Capture en attente de configuration'}
              </b>
              <span>
                {enabled && capture?.capture_html
                  ? 'Prête à être utilisée lors de la publication.'
                  : 'Importez HTML (+ CSS + JS) et activez la capture.'}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
