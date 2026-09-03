'use client'

import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, UploadCloud } from 'lucide-react'
import { FormEvent, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewFunnel() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ id: string; slug: string; pages: number; assets: number; forms: number; ctas: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function createFunnel(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true); setResult(null)
    const supabase = createClient()
    const { data: member } = await supabase.from('organization_members').select('organization_id').order('created_at').limit(1).maybeSingle()
    if (!member) { setError('Create a workspace first.'); setLoading(false); return }
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `funnel-${Date.now()}`
    const { data, error: insertError } = await supabase.from('funnels').insert({ organization_id: member.organization_id, name: name.trim(), slug, source: 'manual', created_by: (await supabase.auth.getUser()).data.user?.id }).select('id').single()
    if (insertError) setError(insertError.message); else window.location.href = `/funnels/${data.id}`
    setLoading(false)
  }

  async function importZip(event: FormEvent) {
    event.preventDefault(); setError(''); setResult(null)
    const file = inputRef.current?.files?.[0]
    if (!file) { setError('Select a ZIP file first.'); return }
    setLoading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      if (name.trim()) body.append('name', name.trim())
      const response = await fetch('/api/funnels/import', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Import failed.')
      setResult({ id: data.funnel.id, slug: data.funnel.slug, pages: data.pages.length, assets: data.analysis.assets, forms: data.analysis.forms, ctas: data.analysis.ctas })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally { setLoading(false) }
  }

  return <div className="page">
    <Link href="/funnels" className="back"><ArrowLeft size={15}/>Funnels</Link>
    <small>NEW FUNNEL</small><h1>Create a funnel</h1>
    <p>Build from scratch or import an existing AI-generated website. Imported code is sanitized and never executed on the Conik app origin.</p>

    <div className="choice" style={{marginTop:24}}>
      <div className="ico"><Sparkles/></div><h2>Start a funnel</h2>
      <form onSubmit={createFunnel}>
        <label className="form-label">Funnel name<input className="form-input" required minLength={2} value={name} onChange={e=>setName(e.target.value)} placeholder="Summer Campaign" /></label>
        {error && !result && <div className="error">{error}</div>}
        <button className="primary" disabled={loading}>{loading ? <><Loader2 size={16} className="spin"/>Creating…</> : 'Create funnel'}</button>
      </form>
    </div>

    <div className="choices">
      <div className="choice">
        <div className="ico"><UploadCloud/></div><h2>Import ZIP</h2>
        <p>Upload an HTML/CSS/JS website ZIP. Conik detects pages, forms, CTAs and safe assets automatically.</p>
        <form onSubmit={importZip}>
          <input ref={inputRef} type="file" accept=".zip,application/zip" className="form-input" />
          {error && <div className="error">{error}</div>}
          {result && <div className="success"><CheckCircle2 size={17}/><div><strong>Import complete.</strong><br/>{result.pages} pages · {result.assets} assets · {result.forms} forms · {result.ctas} CTAs<br/><Link href={`/funnels/${result.id}`}>Open the imported funnel →</Link></div></div>}
          <button type="submit" className="outline" disabled={loading}>{loading ? <><Loader2 size={16} className="spin"/>Analyzing ZIP…</> : 'Import and analyze ZIP'}</button>
        </form>
        <small>Maximum ZIP size: 15 MB · maximum 250 files · 50 HTML pages.</small>
      </div>
      <div className="choice">
        <div className="ico"><Sparkles/></div><h2>Generate with AI</h2>
        <p>AI generation will create pages from your offer, audience and conversion goal.</p>
        <button type="button" className="outline" disabled>AI generator — next phase</button>
      </div>
    </div>
  </div>
}
