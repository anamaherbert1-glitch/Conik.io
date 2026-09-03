'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) }

export default function OnboardingPage() {
  const [name, setName] = useState(''); const [slug, setSlug] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('create_organization', { org_name: name, org_slug: slugify(slug || name) })
    if (error) setError(error.message)
    else window.location.href = '/dashboard'
    setLoading(false)
  }
  return <main className="auth-page"><div className="auth-card wide"><div className="step">STEP 1 OF 1</div><h1>Create your workspace</h1><p>This is the organization that will own your funnels, contacts and campaigns.</p><form onSubmit={submit}><label>Business / organization name<input required minLength={2} maxLength={120} value={name} onChange={e=>{setName(e.target.value); if(!slug) setSlug(slugify(e.target.value))}} placeholder="My Business" /></label><label>Workspace URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={e=>setSlug(slugify(e.target.value))} placeholder="my-business" /><small className="hint">Public funnel URLs will use this workspace later.</small></label>{error && <div className="error">{error}</div>}<button className="primary full" disabled={loading}>{loading ? 'Creating workspace…' : 'Create workspace'}</button></form></div></main>
}
