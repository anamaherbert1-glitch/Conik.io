'use client'

import { FormEvent, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    async function checkWorkspace() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        window.location.replace('/login')
        return
      }

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
    return () => {
      active = false
    }
  }, [])

  async function createWorkspace(orgName: string, orgSlug: string) {
    const supabase = createClient()
    const { error } = await supabase.rpc('create_organization', {
      org_name: orgName,
      org_slug: orgSlug,
    })
    if (error) {
      if (error.message.includes('Workspace already exists')) {
        window.location.replace('/dashboard')
        return
      }
      throw new Error(error.message)
    }
    window.location.replace('/dashboard')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createWorkspace(name.trim(), slugify(slug || name))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de créer l’espace de travail.')
      setLoading(false)
    }
  }

  async function skip() {
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const base = slugify((user?.email || 'mon-espace').split('@')[0] || 'mon-espace') || 'mon-espace'
      const unique = `${base}-${Date.now().toString(36).slice(-5)}`
      await createWorkspace('Mon espace', unique)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de continuer.')
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p className="muted" style={{ textAlign: 'center', margin: 0 }}>
            Vérification de votre espace de travail…
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <div className="auth-card wide">
        <div className="step">OPTIONNEL</div>
        <h1>Créer votre espace de travail</h1>
        <p>
          L’organisation qui détiendra vos tunnels, contacts et campagnes. Vous pouvez aussi passer cette étape
          et commencer tout de suite.
        </p>
        <form onSubmit={submit}>
          <label>
            Nom de l’entreprise / organisation
            <input
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (!slug) setSlug(slugify(e.target.value))
              }}
              placeholder="Mon entreprise"
            />
          </label>
          <label>
            Identifiant d’URL de l’espace de travail
            <input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              placeholder="mon-entreprise"
            />
            <small className="hint">Utilisé plus tard dans les URL publiques de vos tunnels.</small>
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary full" disabled={loading} type="submit">
            {loading ? 'Création…' : 'Créer l’espace de travail'}
          </button>
          <button className="outline full" type="button" disabled={loading} onClick={skip} style={{ marginTop: 8 }}>
            Passer pour l’instant
          </button>
        </form>
      </div>
    </main>
  )
}
