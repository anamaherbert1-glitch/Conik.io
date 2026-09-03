import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PublicFunnel({ params }: { params: Promise<{ funnelSlug: string }> }) {
  const { funnelSlug } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_published_funnel_page', { target_funnel_slug: funnelSlug, target_page_slug: 'home' })
  if (error || !data?.[0]) notFound()
  const page = data[0]
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${page.css || ''}</style></head><body>${page.html || ''}</body></html>`
  return <main style={{ minHeight: '100vh', background: '#fff' }}><iframe title={page.page_name} sandbox="" srcDoc={srcDoc} style={{ width: '100%', minHeight: '100vh', border: 0, display: 'block' }} /></main>
}
