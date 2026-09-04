import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceRole } from '@/lib/auth/require-user'
import { z } from 'zod'
import { createHash } from 'crypto'
import { parseZip, textFrom, assetMime, sanitizeImportedHtml } from '@/lib/zip'

export const runtime = 'nodejs'
const MAX = 25 * 1024 * 1024
const schema = z.object({ name: z.string().trim().min(1).max(120) })

export async function POST(request: NextRequest) {
  try {
    const { supabase, organization } = await requireWorkspaceRole(['owner', 'admin', 'editor'])
    const form = await request.formData()
    const file = form.get('file')
    const parsed = schema.safeParse({ name: String(form.get('name') || 'Imported funnel') })
    if (!parsed.success || !(file instanceof File)) return NextResponse.json({ error: 'Funnel name and ZIP file are required.' }, { status: 400 })
    if (file.size <= 0 || file.size > MAX) return NextResponse.json({ error: 'ZIP must be between 1 byte and 25 MB.' }, { status: 413 })

    const entries = await parseZip(Buffer.from(await file.arrayBuffer()))
    const htmlEntry = entries.find(e => /^((index|home)\.html|[^/]+\/index\.html)$/i.test(e.name)) || entries.find(e => /\.html?$/i.test(e.name))
    if (!htmlEntry) return NextResponse.json({ error: 'No HTML file found.' }, { status: 400 })

    let slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'funnel'
    const { data: existing } = await supabase.from('funnels').select('id').eq('organization_id', organization.id).eq('slug', slug).maybeSingle()
    if (existing) slug = `${slug}-${Date.now().toString().slice(-6)}`

    const html = sanitizeImportedHtml(textFrom(htmlEntry.data, 5 * 1024 * 1024))
    const { data: funnel, error: funnelError } = await supabase.from('funnels').insert({ organization_id: organization.id, name: parsed.data.name, slug, status: 'draft', source: 'import' }).select('id,name,slug').single()
    if (funnelError || !funnel) throw new Error(funnelError?.message || 'Unable to create funnel')

    try {
      const { data: page, error: pageError } = await supabase.from('funnel_pages').insert({ funnel_id: funnel.id, name: 'Home', title: 'Home', slug: 'home', page_type: 'landing', position: 0, is_home: true, html_content: html }).select('id').single()
      if (pageError || !page) throw new Error(pageError?.message || 'Unable to create page')
      const { error: versionError } = await supabase.from('funnel_versions').insert({ page_id: page.id, version_number: 1, html, css: '', js: '', metadata: { imported: true, scriptsRemoved: true } })
      if (versionError) throw new Error(versionError.message)

      const assets = entries.filter(e => assetMime(e.name)).slice(0, 180)
      for (const entry of assets) {
        const mime = assetMime(entry.name)!
        const safeName = entry.name.replace(/[^a-zA-Z0-9._/-]/g, '-').replace(/\/{2,}/g, '/').replace(/^\/+/, '')
        if (!safeName || safeName.includes('..')) throw new Error(`Unsafe asset path: ${entry.name}`)
        const path = `${organization.id}/${funnel.id}/${safeName}`
        const upload = await supabase.storage.from('funnel-assets').upload(path, Buffer.from(entry.data), { contentType: mime, upsert: false })
        if (upload.error) throw new Error(`Asset upload failed for ${entry.name}: ${upload.error.message}`)
        const { error: assetError } = await supabase.from('funnel_assets').insert({ funnel_id: funnel.id, storage_path: path, file_type: mime, size_bytes: entry.data.length, original_name: entry.name, mime_type: mime, sha256: createHash('sha256').update(entry.data).digest('hex') })
        if (assetError) throw new Error(`Asset record failed for ${entry.name}: ${assetError.message}`)
      }
      return NextResponse.json({ ok: true, funnelId: funnel.id, slug: funnel.slug })
    } catch (e) {
      await supabase.from('funnels').delete().eq('id', funnel.id)
      throw e
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Import failed' }, { status: 400 })
  }
}
