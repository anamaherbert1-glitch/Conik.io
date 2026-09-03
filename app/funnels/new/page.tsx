'use client'

import Link from 'next/link'
import { ArrowLeft, Sparkles, UploadCloud } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function NewFunnel() {
  const [name, setName] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  async function createFunnel(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    const supabase = createClient()
    const { data: member } = await supabase.from('organization_members').select('organization_id').order('created_at').limit(1).maybeSingle()
    if (!member) { setError('Create a workspace first.'); setLoading(false); return }
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || `funnel-${Date.now()}`
    const { data, error } = await supabase.from('funnels').insert({ organization_id: member.organization_id, name: name.trim(), slug, source: 'manual', created_by: (await supabase.auth.getUser()).data.user?.id }).select('id').single()
    if (error) setError(error.message); else window.location.href = `/funnels/${data.id}`
    setLoading(false)
  }
  return <div className="page"><Link href="/funnels" className="back"><ArrowLeft size={15}/>Funnels</Link><small>NEW FUNNEL</small><h1>Create a funnel</h1><p>Start with a real database-backed funnel. AI generation and ZIP import will plug into the same model.</p><div className="choice" style={{marginTop:24}}><div className="ico"><Sparkles/></div><h2>Start a funnel</h2><form onSubmit={createFunnel}><label className="form-label">Funnel name<input className="form-input" required minLength={2} value={name} onChange={e=>setName(e.target.value)} placeholder="Summer Campaign" /></label>{error && <div className="error">{error}</div>}<button className="primary" disabled={loading}>{loading ? 'Creating…' : 'Create funnel'}</button></form></div><div className="choices"><div className="choice"><div className="ico"><UploadCloud/></div><h2>Import ZIP</h2><p>Secure ZIP import will validate and isolate HTML, CSS, JavaScript and assets.</p><button type="button" className="outline" disabled>Select ZIP — next phase</button></div><div className="choice"><div className="ico"><Sparkles/></div><h2>Generate with AI</h2><p>AI generation will create pages from your offer, audience and conversion goal.</p><button type="button" className="outline" disabled>AI generator — next phase</button></div></div></div>
}
