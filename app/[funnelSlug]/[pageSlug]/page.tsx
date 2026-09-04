'use client'

import { notFound } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type Page = { funnel_id: string; page_id: string; page_name: string; page_slug: string; html: string; css: string }

export default function PublicFunnelPage({ params }: { params: Promise<{ funnelSlug: string; pageSlug: string }> }) {
  const [page, setPage] = useState<Page | null>(null)
  const [slug, setSlug] = useState('')
  const [pageSlug, setPageSlug] = useState('')
  const [bad, setBad] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => { params.then(p => { setSlug(p.funnelSlug); setPageSlug(p.pageSlug) }) }, [params])

  useEffect(() => {
    if (!slug || !pageSlug) return
    fetch(`/api/funnels/public?funnel=${encodeURIComponent(slug)}&page=${encodeURIComponent(pageSlug)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => setPage(j.page))
      .catch(() => setBad(true))
  }, [slug, pageSlug])

  useEffect(() => {
    const f = frame.current
    if (!f || !page) return
    const visitorKey = 'conik_visitor_id'
    const sessionKey = 'conik_session_id'
    const getId = (key: string) => {
      try {
        const existing = localStorage.getItem(key)
        if (existing) return existing
        const id = crypto.randomUUID()
        localStorage.setItem(key, id)
        return id
      } catch { return crypto.randomUUID() }
    }
    fetch('/api/events/page-view', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funnelId: page.funnel_id, pageId: page.page_id, visitorId: getId(visitorKey), sessionId: getId(sessionKey), referrer: document.referrer || undefined })
    }).catch(() => {})

    const handler = (e: MessageEvent) => {
      if (e.source !== f.contentWindow || e.data?.type !== 'conik-form-submit') return
      const d = e.data.formData && typeof e.data.formData === 'object' ? e.data.formData : {}
      fetch('/api/funnels/capture', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnelSlug: slug, pageSlug, email: String(d.email || d.mail || ''), phone: String(d.phone || d.tel || ''), firstName: String(d.first_name || d.firstname || d.prenom || ''), lastName: String(d.last_name || d.lastname || d.nom || ''), marketingConsent: Boolean(d.marketing_consent || d.consent), formData: d })
      }).then(r => r.ok ? r.json() : Promise.reject()).then(() => f.contentWindow?.postMessage({ type: 'conik-form-result', ok: true }, '*')).catch(() => f.contentWindow?.postMessage({ type: 'conik-form-result', ok: false }, '*'))
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [page, slug, pageSlug])

  if (bad) return notFound()
  if (!page) return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Loading…</main>

  const src = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${page.css || ''}</style></head><body>${page.html || ''}<script>(function(){document.addEventListener('submit',function(e){e.preventDefault();var d={};new FormData(e.target).forEach(function(v,k){d[k]=String(v)});parent.postMessage({type:'conik-form-submit',formData:d},'*')},true);window.addEventListener('message',function(e){if(e.data&&e.data.type==='conik-form-result'){var m=document.getElementById('conik-result');if(!m){m=document.createElement('div');m.id='conik-result';m.setAttribute('role','status');m.style.cssText='position:fixed;bottom:20px;left:20px;right:20px;padding:14px;border-radius:8px;background:#111;color:#fff;font:14px system-ui;z-index:2147483647;text-align:center';document.body.appendChild(m)}m.textContent=e.data.ok?'Thank you. Your submission was received.':'Unable to submit the form. Please try again.'}})})()</script></body></html>`

  return <main style={{ minHeight: '100vh', background: '#fff' }}><iframe ref={frame} title={page.page_name} sandbox="allow-scripts allow-forms" srcDoc={src} style={{ width: '100%', minHeight: '100vh', height: '100vh', border: 0, display: 'block' }} /></main>
}
