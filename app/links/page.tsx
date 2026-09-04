'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Copy, ExternalLink, Link2, Trash2 } from 'lucide-react'
import { AppShell } from '@/components/app-shell'

type TrackedLink = {
  id: string
  slug: string
  destination_url: string
  funnel_id: string | null
  created_at: string
  clicks: number
}

export default function LinksPage() {
  const [links, setLinks] = useState<TrackedLink[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [origin, setOrigin] = useState('')

  useEffect(() => setOrigin(window.location.origin), [])

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch('/api/links')
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) setError(payload.error || 'Impossible de charger les liens.')
    else setLinks(payload.links || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    const form = event.currentTarget
    const data = new FormData(form)
    const response = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: String(data.get('slug') || '').trim(),
        destination_url: String(data.get('destination_url') || '').trim(),
      }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) setError(payload.error || 'Impossible de créer le lien.')
    else {
      form.reset()
      setNotice('Lien de redirection créé.')
      await load()
    }
    setSaving(false)
  }

  async function remove(id: string, slug: string) {
    if (!window.confirm(`Supprimer définitivement le lien /r/${slug} ?`)) return
    setError('')
    setNotice('')
    const response = await fetch(`/api/links/${id}`, { method: 'DELETE' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) setError(payload.error || 'Suppression impossible.')
    else {
      setNotice('Lien supprimé.')
      await load()
    }
  }

  async function copy(slug: string) {
    const url = `${origin}/r/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      setNotice(`Lien copié : ${url}`)
    } catch {
      setNotice(`Copiez ce lien : ${url}`)
    }
  }

  return (
    <AppShell active="Links">
      <header>
        <div>
          <small>LIENS</small>
          <h1>Liens de redirection</h1>
          <p className="muted">
            Créez des liens courts hébergés par Conik, redirigez vos visiteurs où vous voulez et
            mesurez chaque clic.
          </p>
        </div>
      </header>

      {error && <div className="error">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="section-head">
          <h3>Nouveau lien</h3>
        </div>
        <form onSubmit={create} className="inline-form">
          <label>
            Identifiant du lien (optionnel)
            <input
              className="form-input"
              name="slug"
              placeholder="promo-noel"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              maxLength={60}
            />
            <small className="hint">Laissez vide pour générer un identifiant automatique.</small>
          </label>
          <label>
            URL de destination
            <input
              className="form-input"
              name="destination_url"
              type="url"
              required
              placeholder="https://exemple.com/mon-offre"
            />
          </label>
          <button className="primary" disabled={saving}>
            {saving ? 'Création…' : 'Créer le lien'}
          </button>
        </form>
      </section>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="section-head">
          <h3>Vos liens</h3>
          <span>{links.length} au total</span>
        </div>
        {loading ? (
          <div className="emptybox">Chargement des liens…</div>
        ) : links.length === 0 ? (
          <div className="emptybox">
            <Link2 size={28} />
            <b>Aucun lien pour le moment</b>
            <p>Créez votre premier lien de redirection avec le formulaire ci-dessus.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Lien Conik</th>
                  <th>Destination</th>
                  <th>Clics</th>
                  <th>Créé le</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id}>
                    <td>
                      <b>/r/{link.slug}</b>
                    </td>
                    <td
                      style={{
                        maxWidth: 320,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {link.destination_url}
                    </td>
                    <td>{link.clicks}</td>
                    <td>{new Date(link.created_at).toLocaleDateString('fr-FR')}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="outline"
                        onClick={() => copy(link.slug)}
                        title="Copier le lien"
                        aria-label={`Copier le lien /r/${link.slug}`}
                      >
                        <Copy size={14} />
                      </button>
                      <a
                        className="outline"
                        href={`/r/${link.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Tester la redirection"
                        aria-label={`Tester la redirection /r/${link.slug}`}
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        type="button"
                        className="outline"
                        onClick={() => remove(link.id, link.slug)}
                        title="Supprimer le lien"
                        aria-label={`Supprimer le lien /r/${link.slug}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  )
}
