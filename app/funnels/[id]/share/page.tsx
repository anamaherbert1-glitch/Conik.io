'use client'

import Link from 'next/link'
import { ArrowLeft, ImagePlus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Page = { id: string; name: string; slug: string; position: number }

type Version = { id: string; metadata: Record<string, unknown> | null }

export default function ShareSettings({ params }: { params: Promise<{ id: string }> }) {
  const [funnelId, setFunnelId] = useState('')
  const [pages, setPages] = useState<Page[]>([])
  const [pageId, setPageId] = useState('')
  const [version, setVersion] = useState<Version | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { params.then(({ id }) => setFunnelId(id)) }, [params])

  useEffect(() => {
    if (!funnelId) return
    void (async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('funnel_pages')
        .select('id,name,slug,position')
        .eq('funnel_id', funnelId)
        .order('position')
      if (error) { setMessage(error.message); return }
      const list = data || []
      setPages(list)
      if (list.length) setPageId((current) => current || list[0].id)
    })()
  }, [funnelId])

  useEffect(() => {
    if (!pageId) return
    void (async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('funnel_versions')
        .select('id,metadata')
        .eq('page_id', pageId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) { setMessage(error.message); return }
      setVersion(data)
      const url = data?.metadata && typeof data.metadata.share_image_url === 'string'
        ? data.metadata.share_image_url
        : ''
      setImageUrl(url)
      setMessage('')
    })()
  }, [pageId])

  async function upload(file: File) {
    if (!pageId) return
    setBusy(true); setMessage('Upload de l’image…')
    try {
      const body = new FormData()
      body.append('pageId', pageId)
      body.append('file', file)
      const response = await fetch('/api/funnels/pages/share-image', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Upload impossible.')
      setImageUrl(data.imageUrl)
      setMessage('Image d’aperçu enregistrée. Les nouveaux partages utiliseront cette image.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload impossible.')
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!version) return
    setBusy(true); setMessage('Suppression…')
    const supabase = createClient()
    const metadata = version.metadata && typeof version.metadata === 'object' ? { ...version.metadata } : {}
    delete metadata.share_image_url
    const { error } = await supabase.from('funnel_versions').update({ metadata }).eq('id', version.id)
    if (error) setMessage(error.message)
    else { setImageUrl(''); setVersion({ ...version, metadata }); setMessage('Image personnalisée supprimée. Le visuel par défaut sera utilisé.') }
    setBusy(false)
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/funnels/${funnelId}/editor`} className="rounded-lg border px-3 py-2 text-sm">
            <ArrowLeft className="mr-2 inline h-4 w-4" /> Retour à l’éditeur
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Image d’aperçu du lien</h1>
            <p className="text-sm text-muted-foreground">Choisissez l’image affichée quand le lien de votre page est partagé.</p>
          </div>
        </div>

        <section className="rounded-2xl border bg-card p-5 shadow-sm space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium">Page</label>
            <select value={pageId} onChange={(e) => setPageId(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2">
              {pages.map((page) => <option key={page.id} value={page.id}>{page.name} · /{page.slug}</option>)}
            </select>
          </div>

          <div className="rounded-xl border border-dashed p-4">
            <div className="mb-4 flex items-center gap-3">
              <ImagePlus className="h-5 w-5" />
              <div>
                <p className="font-medium">Image personnalisée</p>
                <p className="text-xs text-muted-foreground">JPG, PNG ou WebP · 8 Mo maximum · format recommandé 1200 × 630</p>
              </div>
            </div>
            {imageUrl ? (
              <div className="space-y-3">
                <img src={imageUrl} alt="Aperçu du lien" className="aspect-[1200/630] w-full rounded-xl object-cover" />
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                    Remplacer l’image
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.currentTarget.value = '' }} />
                  </label>
                  <button type="button" onClick={() => void remove()} disabled={busy} className="rounded-lg border px-4 py-2 text-sm">
                    <Trash2 className="mr-2 inline h-4 w-4" /> Supprimer
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center rounded-xl bg-muted px-4 py-12 text-center">
                <div>
                  <ImagePlus className="mx-auto mb-2 h-8 w-8" />
                  <p className="font-medium">Ajouter une image</p>
                  <p className="mt-1 text-xs text-muted-foreground">Cette image sera utilisée pour le partage social.</p>
                </div>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.currentTarget.value = '' }} />
              </label>
            )}
          </div>

          {message && <p className="rounded-lg bg-muted px-3 py-2 text-sm">{message}</p>}
        </section>
      </div>
    </main>
  )
}
