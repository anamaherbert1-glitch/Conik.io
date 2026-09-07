import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { extractBody, extractStyles } from '@/lib/funnel/import'
import { sanitizeImportedHtml } from '@/lib/zip'

export const runtime = 'nodejs'
const MAX_HTML_BYTES = 5 * 1024 * 1024

function cleanSlug(value: string) {
  return value.trim().toLowerCase()
}

function extractInlineScripts(html: string) {
  const scripts: string[] = []
  const clean = html.replace(/<script\\b[^>]*>([\\s\\S]*?)<\\/script>/gi, (_whole, body: string) => {
    if (body.trim()) scripts.push(body.trim())
    return ''
  })
  return { html: clean, js: scripts.join('\\n\\n') }
}

async function getFunnel(request: NextRequest) {
  const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
  const url = new URL(request.url)
  const funnelId = String(url.searchParams.get('funnelId') || '').trim()
  if (!/^[0-9a-f-]{36}$/i.test(funnelId)) throw new Error('Tunnel invalide.')
  const { data: funnel, error } = await supabase.from('funnels').select('id,name,slug,capture_enabled,capture_delay_ms,capture_html,capture_css,capture_js').eq('id', funnelId).eq('organization_id', organization.id).single()
  if (error || !funnel) throw new Error('Tunnel introuvable ou accès refusé.')
  return { supabase, funnel }
}

export async function GET(request: NextRequest) {
  try {
    const { funnel } = await getFunnel(request)
    return NextResponse.json({ capture: funnel })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Impossible de charger la page de capture.' }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const form = await request.formData()
    const funnelId = String(form.get('funnelId') || '').trim()
    if (!/^[0-9a-f-]{36}$/i.test(funnelId)) return NextResponse.json({ error: 'Tunnel invalide.' }, { status: 400 })
    const { data: funnel, error: funnelError } = await supabase.from('funnels').select('id,name,slug').eq('id', funnelId).eq('organization_id', organization.id).single()
    if (funnelError || !funnel) return NextResponse.json({ error: 'Tunnel introuvable ou accès refusé.' }, { status: 404 })

    const file = form.get('file')
    let captureHtml: string | undefined
    let captureCss: string | undefined
    let captureJs: string | undefined
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_HTML_BYTES) return NextResponse.json({ error: 'Le fichier de capture dépasse 5 Mo.' }, { status: 413 })
      if (!/\\.html?$/i.test(file.name) && file.type !== 'text/html') return NextResponse.json({ error: 'Importez un fichier HTML pour la page de capture.' }, { status: 400 })
      const source = Buffer.from(await file.arrayBuffer()).toString('utf8')
      const extracted = extractInlineScripts(source)
      const clean = sanitizeImportedHtml(extracted.html)
      const styled = extractStyles(clean, file.name, () => null)
      captureHtml = extractBody(styled.html)
      captureCss = styled.css
      captureJs = extracted.js
    }

    const enabledRaw = String(form.get('enabled') || '').trim().toLowerCase()
    const enabled = ['1', 'true', 'on', 'yes', 'oui'].includes(enabledRaw)
    const delayRaw = Number(form.get('delayMs') || 5000)
    const delayMs = Number.isFinite(delayRaw) ? Math.min(30000, Math.max(0, Math.round(delayRaw))) : 5000
    const update: Record<string, unknown> = { capture_enabled: enabled, capture_delay_ms: delayMs }
    if (captureHtml !== undefined) { update.capture_html = captureHtml; update.capture_css = captureCss || ''; update.capture_js = captureJs || '' }
    const { data, error } = await supabase.from('funnels').update(update).eq('id', funnel.id).select('id,name,slug,capture_enabled,capture_delay_ms,capture_html,capture_css,capture_js').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, capture: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Enregistrement impossible.' }, { status: 400 })
  }
}
