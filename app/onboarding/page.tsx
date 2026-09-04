'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) }

export default function OnboardingPage() {
  const [name, setName] = useState(''); const [slug, setSlug] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    async function checkWorkspace() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.replace('/login'); return }

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (!active) return
      if (membership) window.location.replace('/dashboard')
      else setChecking(false)
    }
    void checkWorkspace()
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('create_organization', { org_name: name, org_slug: slugify(slug || name) })
    if (error) setError(error.message.includes('Workspace already exists') ? 'Un espace de travail existe déjà pour ce compte.' : error.message)
    else window.location.replace('/dashboard')
    setLoading(false)
  }

  if (checking) return <main className="auth-page"><div className="auth-card"><p>Vérification de votre espace de travail…</p></div></main>

  return <main className="auth-page"><div className="auth-card wide"><div className="step">ÉTAPE 1 SUR 1</div><h1>Créer votre espace de travail</h1><p>Il s’agit de l’organisation qui détiendra vos tunnels, contacts et campagnes.</p><form onSubmit={submit}><label>Nom de l’entreprise / organisation<input required minLength={2} maxLength={120} value={name} onChange={e=>{setName(e.target.value); if(!slug) setSlug(slugify(e.target.value))}} placeholder="Mon entreprise" /></label><label>Identifiant d’URL de l’espace de travail<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={e=>setSlug(slugify(e.target.value))} placeholder="mon-entreprise" /><small className="hint">Les URL publiques de vos tunnels utiliseront cet espace de travail par la suite.</small></label>{error && <div className="error">{error}</div>}<button className="primary full" disabled={loading}>{loading ? 'Création de l’espace de travail…' : 'Créer l’espace de travail'}</button></form></div></main>
}
