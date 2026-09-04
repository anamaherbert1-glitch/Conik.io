'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'

export default function ContactDetail({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('')
  const [c, setC] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [allTags, setAllTags] = useState<any[]>([])
  const [selectedTag, setSelectedTag] = useState('')
  const [newTag, setNewTag] = useState('')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [tagBusy, setTagBusy] = useState(false)

  useEffect(() => {
    params.then(p => setId(p.id))
  }, [params])

  async function loadContact(contactId: string) {
    const r = await fetch(`/api/contacts/${contactId}`, { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error || 'Contact not found.')
    setC(j.contact)
    setActivity(j.activity || [])
    setTags(j.tags || [])
    setFirst(j.contact.first_name || '')
    setLast(j.contact.last_name || '')
    setEmail(j.contact.email || '')
    setPhone(j.contact.phone || '')
    setConsent(Boolean(j.contact.consent_marketing))
  }

  async function loadTags() {
    const r = await fetch('/api/tags', { cache: 'no-store' })
    const j = await r.json().catch(() => ({}))
    if (r.ok) setAllTags(j.tags || [])
  }

  useEffect(() => {
    if (!id) return
    Promise.all([loadContact(id), loadTags()]).catch(e => setError(e.message))
  }, [id])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const r = await fetch(`/api/contacts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: first, last_name: last, email, phone, consent_marketing: consent })
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Unable to save')
    else setC({ ...c, ...j.contact, consent_marketing: consent })
    setSaving(false)
  }

  async function addTag(tagId = selectedTag) {
    if (!tagId) return
    setTagBusy(true)
    setError('')
    const r = await fetch(`/api/contacts/${id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_id: tagId })
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Unable to add tag')
    else {
      setSelectedTag('')
      await loadContact(id)
    }
    setTagBusy(false)
  }

  async function removeTag(tagId: string) {
    setTagBusy(true)
    setError('')
    const r = await fetch(`/api/contacts/${id}/tags?tag_id=${encodeURIComponent(tagId)}`, { method: 'DELETE' })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Unable to remove tag')
    else await loadContact(id)
    setTagBusy(false)
  }

  async function createAndAddTag(e: React.FormEvent) {
    e.preventDefault()
    const name = newTag.trim()
    if (!name) return
    setTagBusy(true)
    setError('')
    const r = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setError(j.error || 'Unable to create tag')
    else {
      setNewTag('')
      setAllTags(prev => [...prev, j.tag].sort((a, b) => a.name.localeCompare(b.name)))
      await addTag(j.tag.id)
    }
    setTagBusy(false)
  }

  async function remove() {
    if (!confirm('Delete this contact permanently?')) return
    const r = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    if (r.ok) location.href = '/contacts'
    else {
      const j = await r.json().catch(() => ({}))
      setError(j.error || 'Unable to delete')
    }
  }

  const assignedIds = new Set(tags.map(t => t.id))
  const availableTags = allTags.filter(t => !assignedIds.has(t.id))

  if (error && !c) return <AppShell active="Contacts"><div className="error">{error}</div><Link href="/contacts" className="outline">Back to contacts</Link></AppShell>

  return <AppShell active="Contacts">
    <header>
      <div><small>CRM / CONTACT</small><h1>{c ? [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email : 'Contact'}</h1><p className="muted">Edit contact data and manage tags and real activity history.</p></div>
      <Link href="/contacts" className="outline">Back</Link>
    </header>

    {error && <div className="error">{error}</div>}

    <section className="panel">
      <form onSubmit={save} style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
        <div className="form-grid">
          <label>First name<input className="form-input" value={first} onChange={e => setFirst(e.target.value)} /></label>
          <label>Last name<input className="form-input" value={last} onChange={e => setLast(e.target.value)} /></label>
          <label>Email<input className="form-input" type="email" required={phone.length === 0} value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label>Phone<input className="form-input" required={email.length === 0} value={phone} onChange={e => setPhone(e.target.value)} /></label>
        </div>
        <label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> Marketing consent granted</label>
        <div style={{ display: 'flex', gap: 8 }}><button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button><button type="button" className="outline" onClick={remove}>Delete</button></div>
      </form>
    </section>

    <section className="panel" style={{ marginTop: 18 }}>
      <h2>Tags</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        {tags.length ? tags.map(t => <span key={t.id} className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {t.name}
          <button type="button" onClick={() => removeTag(t.id)} disabled={tagBusy} aria-label={`Remove ${t.name}`} style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}>×</button>
        </span>) : <p className="muted">No tags assigned.</p>}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select className="form-input" value={selectedTag} onChange={e => setSelectedTag(e.target.value)} disabled={tagBusy || availableTags.length === 0} style={{ maxWidth: 260 }}>
          <option value="">Select a tag…</option>
          {availableTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="button" className="primary" onClick={() => addTag()} disabled={tagBusy || !selectedTag}>{tagBusy ? 'Working…' : 'Add tag'}</button>
      </div>
      <form onSubmit={createAndAddTag} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <input className="form-input" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Create a new tag…" maxLength={80} style={{ maxWidth: 260 }} />
        <button type="submit" className="outline" disabled={tagBusy || !newTag.trim()}>Create & add</button>
      </form>
    </section>

    <section className="panel" style={{ marginTop: 18 }}>
      <h2>Activity</h2>
      {activity.length ? <div className="funnel-table">{activity.map(a => <div className="funnel-row" key={a.id}><div><b>{a.type}</b><span>{new Date(a.created_at).toLocaleString()}</span></div></div>)}</div> : <p className="muted">No activity recorded yet.</p>}
    </section>
  </AppShell>
}
