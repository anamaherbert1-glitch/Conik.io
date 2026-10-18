'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

export default function OnboardingPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [company, setCompany] = useState('')
  const [workspace, setWorkspace] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.replace('/login'); return }

      const { data: membership } = await supabase.from('organization_members').select('organization_id').eq('user_id', user.id).limit(1).maybeSingle()
      if (!active) return
      if (membership) { window.location.replace('/dashboard'); return }

      const metadata = user.user_metadata ?? {}
      const metadataName = typeof metadata.full_name === 'string' ? metadata.full_name : ''
      const metadataPhone = typeof metadata.phone === 'string' ? metadata.phone : ''
      const metadataCountry = typeof metadata.country === 'string' ? metadata.country : ''
      const metadataCity = typeof metadata.city === 'string' ? metadata.city : ''
      const metadataCompany = typeof metadata.company === 'string' ? metadata.company : ''
      const { data: profile } = await supabase.from('profiles').select('full_name,phone,country,city,company').eq('id', user.id).maybeSingle()
      if (!active) return
      const fullName = profile?.full_name || metadataName
      const companyName = profile?.company || metadataCompany
      setEmail(user.email ?? '')
      setName(fullName)
      setPhone(profile?.phone || metadataPhone)
      setCountry(profile?.country || metadataCountry)
      setCity(profile?.city || metadataCity)
      setCompany(companyName)
      setWorkspace(companyName || fullName || '')
      setSlug(slugify(companyName || fullName || (user.email || '').split('@')[0] || 'mon-espace'))
      setChecking(false)
    }
    void load()
    return () => { active = false }
  }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Session expirée. Reconnectez-vous.')
      const workspaceName = workspace.trim() || company.trim() || name.trim() || 'Mon espace'
      const workspaceSlug = slugify(slug || workspaceName)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id, full_name: name.trim(), phone: phone.trim(), country: country.trim(),
        city: city.trim(), company: company.trim(), updated_at: new Date().toISOString(),
      })
      if (profileError) throw profileError
      const { error: orgError } = await supabase.rpc('create_organization', { org_name: workspaceName, org_slug: workspaceSlug })
      if (orgError) {
        if (orgError.message.includes('Workspace already exists')) { window.location.replace('/dashboard'); return }
        throw orgError
      }
      window.location.replace('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de créer le compte.')
      setLoading(false)
    }
  }

  if (checking) return <main className="auth-page"><div className="auth-card"><p className="muted" style={{textAlign:'center',margin:0}}>Préparation de votre profil…</p></div></main>

  return (
    <main className="auth-page">
      <div className="auth-card wide">
        <div className="step">NOUVEAU COMPTE</div>
        <h1>Complétez votre profil</h1>
        <p>Vérifiez les informations préremplies, puis configurez votre espace Conik.</p>
        <form onSubmit={submit}>
          <label>Adresse e-mail<input type="email" value={email} readOnly /></label>
          <label>Nom complet<input required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Votre nom complet" /></label>
          <label>Téléphone<input type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+228 ..." /></label>
          <label>Pays<input autoComplete="country-name" value={country} onChange={e=>setCountry(e.target.value)} placeholder="Togo" /></label>
          <label>Ville<input autoComplete="address-level2" value={city} onChange={e=>setCity(e.target.value)} placeholder="Lomé" /></label>
          <label>Entreprise / organisation<input autoComplete="organization" value={company} onChange={e=>setCompany(e.target.value)} placeholder="Mon entreprise" /></label>
          <label>Nom de l’espace de travail<input required minLength={2} maxLength={120} value={workspace} onChange={e=>{setWorkspace(e.target.value); if(!slug) setSlug(slugify(e.target.value))}} placeholder="Mon espace" /></label>
          <label>Identifiant d’URL<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={e=>setSlug(slugify(e.target.value))} placeholder="mon-espace" /><small className="hint">Utilisé dans les URL publiques de vos tunnels.</small></label>
          {error && <div className="error" role="alert">{error}</div>}
          <button className="primary full" disabled={loading} type="submit">{loading ? 'Enregistrement…' : 'Terminer et accéder à Conik'}</button>
        </form>
      </div>
    </main>
  )
}
