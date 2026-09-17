'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicPaymentCheckout } from '@/components/public-payment-checkout'

type RuntimeScript = { src?: string; code?: string; type?: string }

type PublishedPage = {
  funnel_id: string
  funnel_name?: string
  page_id: string
  page_name: string
  page_slug?: string
  html: string
  css: string
  js: string
  metadata?: Record<string, unknown>
  capture_enabled?: boolean
  capture_delay_ms?: number
  capture_html?: string
  capture_css?: string
  capture_js?: string
  is_first_page?: boolean
}

type PaymentMeta = {
  id: string
  name: string
  slug: string
  status: string
  funnel_id: string
  tariff_slug: string | null
}

const VISITOR_KEY = 'conik_visitor_id'
const SESSION_KEY = 'conik_session_id'
const CAPTURE_SHOWN_PREFIX = 'conik_capture_shown:'

function localId(key: string) {
  try {
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    localStorage.setItem(key, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function pick(data: Record<string, string>, pattern: RegExp) {
  for (const [key, value] of Object.entries(data)) {
    if (value && pattern.test(key)) return value
  }
  return ''
}

function checked(value: string) {
  return ['true', '1', 'on', 'yes', 'oui', 'checked', 'accepted', 'accepté', 'accepte'].includes(
    value.trim().toLowerCase(),
  )
}

function explicitConsent(value: string) {
  const v = value.trim().toLowerCase()
  if (['false', '0', 'no', 'non', 'off', 'unchecked', 'declined', 'refused', 'refusé'].includes(v)) {
    return false
  }
  return checked(v)
}

const EMAIL_RE = /^(e?-?mail|courriel|adresse[-_ ]?mail)/i
const PHONE_RE = /(phone|tel|telephone|téléphone|mobile|whatsapp|numero|numéro)/i
const FIRST_RE = /(first[-_ ]?name|firstname|prenom|prénom|^fname$)/i
const LAST_RE = /(last[-_ ]?name|lastname|surname|^nom$|family)/i
const FULL_RE = /^(name|nom[-_ ]?complet|full[-_ ]?name|fullname)$/i
const WHATSAPP_OPTIN_RE =
  /whatsapp.*(consent|opt[-_ ]?in|accept|marketing)|(?:consent|opt[-_ ]?in).*whatsapp/i
const WHATSAPP_CONSENT_TEXT_RE =
  /whatsapp.*(consent[_-]?text|opt[-_]?in[_-]?text)|(?:consent[_-]?text|opt[-_]?in[_-]?text).*whatsapp/i

const BRIDGE = `(function(){function send(type,payload){try{parent.postMessage(Object.assign({type:type},payload||{}),'*')}catch(e){}}function navigate(href){href=(href||'').trim();if(!href||href.charAt(0)==='#')return false;if(/^https?:\\/\\//i.test(href)){window.open(href,'_blank','noopener')}else if(href.charAt(0)==='/'){send('conik-navigate',{href:href})}else{try{var u=new URL(href,window.location.href);if(u.origin===window.location.origin)send('conik-navigate',{href:u.pathname+u.search+u.hash});else window.open(u.toString(),'_blank','noopener')}catch(e){window.location.href=href}}return true}document.addEventListener('submit',function(e){e.preventDefault();var data={};try{new FormData(e.target).forEach(function(v,k){if(typeof v==='string')data[k]=v})}catch(err){}send('conik-form-submit',{formData:data})},true);document.addEventListener('click',function(e){var target=e.target;var paymentEl=target&&target.closest?target.closest('[data-conik-payment],a[href="#conik-payment"]'):null;if(paymentEl){e.preventDefault();send('conik-payment');return}var el=target&&target.closest?target.closest('[data-conik-redirect],a[href],button[type="button"],button[onclick]'):null;if(!el)return;var href=el.getAttribute('data-conik-redirect')||el.getAttribute('href')||'';if(!href){var onclick=el.getAttribute('onclick')||'';var match=onclick.match(/(?:window\\.location(?:\\.href)?|location(?:\\.href)?)\\s*=\\s*["']([^"']+)["']/i);if(match)href=match[1]}if(href&&navigate(href))e.preventDefault()},true);window.addEventListener('message',function(e){if(!e.data||e.data.type!=='conik-form-result')return;var m=document.getElementById('conik-result');if(!m){m=document.createElement('div');m.id='conik-result';m.style.cssText='position:fixed;bottom:20px;left:20px;right:20px;padding:14px 16px;border-radius:10px;background:#101418;color:#fff;font:15px/1.4 system-ui,sans-serif;z-index:2147483647;text-align:center';document.body.appendChild(m)}m.textContent=e.data.ok?'Merci ! Vos informations ont bien été enregistrées.':'Envoi impossible. Merci de réessayer.'})})()`

function isSafeExternalScript(url: string) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

function escapeScriptCode(value: string) {
  return value.split('</' + 'script').join('<\\/' + 'script')
}

export function FunnelRuntime({
  funnelSlug,
  pageSlug,
}: {
  funnelSlug: string
  pageSlug: string
}) {
  const router = useRouter()
  const frame = useRef<HTMLIFrameElement>(null)
  const captureFrame = useRef<HTMLIFrameElement>(null)
  const paymentRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState<PublishedPage | null>(null)
  const [payment, setPayment] = useState<PaymentMeta | null>(null)
  const [missing, setMissing] = useState(false)
  const [showCapture, setShowCapture] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch(
          `/api/funnels/public?funnel=${encodeURIComponent(funnelSlug)}&page=${encodeURIComponent(pageSlug || 'home')}`,
          { cache: 'default' },
        )
        if (!response.ok) {
          if (!cancelled) setMissing(true)
          return
        }
        const json = await response.json()
        if (!cancelled) {
          setPage(json.page)
          setPayment(json.payment || null)
        }
      } catch {
        if (!cancelled) setMissing(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [funnelSlug, pageSlug])

  useEffect(() => {
    const f = frame.current
    if (!f || !page) return

    document.title = page.page_name || page.funnel_name || 'Conik'

    fetch('/api/events/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        funnelId: page.funnel_id,
        pageId: page.page_id,
        visitorId: localId(VISITOR_KEY),
        sessionId: localId(SESSION_KEY),
        referrer: document.referrer || undefined,
      }),
    }).catch(() => {})

    const captureKey = CAPTURE_SHOWN_PREFIX + page.funnel_id
    let timer: number | undefined
    if (page.capture_enabled && page.capture_html && page.is_first_page) {
      try {
        if (sessionStorage.getItem(captureKey) !== '1') {
          timer = window.setTimeout(
            () => setShowCapture(true),
            Math.max(1000, Math.min(60000, page.capture_delay_ms ?? 5000)),
          )
        }
      } catch {
        setShowCapture(true)
      }
    }

    const handler = (event: MessageEvent) => {
      if (event.source !== f.contentWindow && event.source !== captureFrame.current?.contentWindow) {
        return
      }
      const type = event.data?.type
      if (type === 'conik-capture-success') {
        setShowCapture(false)
        return
      }
      if (type === 'conik-payment') {
        paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      if (type === 'conik-navigate') {
        const href = String(event.data.href || '')
        if (href.startsWith('/')) router.push(href)
        return
      }
      if (type !== 'conik-form-submit') return

      const raw = event.data.formData
      const data: Record<string, string> =
        raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
      const full = pick(data, FULL_RE)
      const firstName =
        pick(data, FIRST_RE) || (full ? full.split(' ').slice(0, -1).join(' ') : '')
      const lastName =
        pick(data, LAST_RE) || (full.includes(' ') ? full.split(' ').slice(-1)[0] : '')
      const consent = Object.entries(data).find(([key]) =>
        /(consent|optin|opt[-_ ]?in|newsletter|accept)/i.test(key),
      )
      const marketingConsent = consent ? explicitConsent(consent[1]) : false
      const whatsappOptIn = Object.entries(data).some(
        ([key, value]) => WHATSAPP_OPTIN_RE.test(key) && checked(value),
      )
      const whatsappConsentText = pick(data, WHATSAPP_CONSENT_TEXT_RE)

      let timezone = ''
      try {
        timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      } catch {}

      const reply = (ok: boolean) => {
        const source = event.source as Window | null
        source?.postMessage({ type: 'conik-form-result', ok }, '*')
      }

      fetch('/api/funnels/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          funnelSlug,
          pageSlug: page.page_slug || pageSlug,
          email: pick(data, EMAIL_RE),
          phone: pick(data, PHONE_RE),
          firstName,
          lastName,
          marketingConsent,
          whatsappOptIn,
          whatsappConsentText,
          formData: {
            ...data,
            _timezone: timezone,
            _language: navigator.language || '',
            _referrer: document.referrer || '',
            _page: `${funnelSlug}/${page.page_slug || pageSlug}`,
          },
        }),
      })
        .then(async (response) => {
          const json = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(json.error || 'capture_failed')
          return json
        })
        .then(() => {
          try {
            sessionStorage.setItem(captureKey, '1')
          } catch {}
          setShowCapture(false)
          reply(true)
        })
        .catch(() => reply(false))
    }

    window.addEventListener('message', handler)
    return () => {
      window.removeEventListener('message', handler)
      if (timer) window.clearTimeout(timer)
    }
  }, [page, funnelSlug, pageSlug, router])

  if (missing) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div>
          <h1>Page introuvable</h1>
          <p>Ce tunnel ou cette page n’existe pas ou n’est pas publiée.</p>
        </div>
      </main>
    )
  }

  if (!page) {
    return (
      <main
        style={{
          minHeight: '100vh',
          margin: 0,
          padding: 0,
          width: '100%',
          background: '#ffffff',
        }}
        aria-busy="true"
        aria-label="Chargement de la page"
      />
    )
  }

  const runtimeScripts: RuntimeScript[] = Array.isArray(page.metadata?.runtime_scripts)
    ? page.metadata.runtime_scripts
        .filter((value): value is RuntimeScript => !!value && typeof value === 'object')
        .map((value) => ({
          src: typeof value.src === 'string' ? value.src : undefined,
          code: typeof value.code === 'string' ? value.code : undefined,
          type: typeof value.type === 'string' ? value.type : undefined,
        }))
    : []

  const legacyScripts: RuntimeScript[] = []
  if (page.js?.trim()) legacyScripts.push({ code: page.js })

  const scripts: RuntimeScript[] = runtimeScripts.length ? runtimeScripts : legacyScripts

  const scriptTags = scripts
    .map((script) => {
      const typeAttr =
        script.type && script.type.trim()
          ? ` type="${script.type.replace(/"/g, '"')}"`
          : ''
      if (script.src && isSafeExternalScript(script.src)) {
        const safeSrc = script.src.replace(/&/g, '&').replace(/"/g, '"')
        return `<script${typeAttr} src="${safeSrc}"><\/script>`
      }
      if (script.code) {
        return `<script${typeAttr}>${escapeScriptCode(script.code)}<\/script>`
      }
      return ''
    })
    .join('')

  const fallbackJs = runtimeScripts.length
    ? ''
    : `<script>${escapeScriptCode(page.js || '')}<\/script>`

  const srcDoc =
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}${page.css || ''}</style></head><body>${page.html || ''}${scriptTags}${fallbackJs}<script>${BRIDGE}<\/script></body></html>`

  const captureSrc = page.capture_html
    ? `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}${page.capture_css || ''}</style></head><body>${page.capture_html}<script>${escapeScriptCode(page.capture_js || '')}<\/script><script>${BRIDGE}<\/script></body></html>`
    : ''

  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        padding: 0,
        width: '100%',
        background: '#ffffff',
      }}
    >
      <iframe
        ref={frame}
        title={page.page_name}
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        srcDoc={srcDoc}
        style={{ width: '100%', height: '100vh', border: 0, display: 'block', background: '#ffffff' }}
      />
      {payment?.tariff_slug && (
        <div
          ref={paymentRef}
          id="conik-payment"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '24px 16px 40px',
            background: '#f8fafc',
            scrollMarginTop: 16,
          }}
        >
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <PublicPaymentCheckout
              funnelSlug={funnelSlug}
              pageSlug={pageSlug}
              tariffSlug={payment.tariff_slug}
            />
          </div>
        </div>
      )}
      {showCapture && captureSrc && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483646,
            background: 'rgba(15,23,42,.68)',
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 'min(720px,100%)',
              maxHeight: 'calc(100vh - 32px)',
              background: '#fff',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <iframe
              ref={captureFrame}
              title="Page de capture"
              sandbox="allow-scripts allow-forms allow-popups"
              srcDoc={captureSrc}
              style={{
                width: '100%',
                height: 'min(760px,calc(100vh - 32px))',
                border: 0,
                display: 'block',
              }}
            />
          </div>
        </div>
      )}
    </main>
  )
}
