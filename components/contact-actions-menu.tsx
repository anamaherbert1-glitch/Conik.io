'use client'

import Link from 'next/link'
import { ExternalLink, MoreVertical, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ContactActionsMenu({ contactId }: { contactId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (!window.confirm('Supprimer ce contact ? Cette action est irréversible.')) return
    setBusy(true)
    const response = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' })
    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
      window.alert(json.error || 'Impossible de supprimer le contact.')
      setBusy(false)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="outline" aria-label="Actions du contact" aria-expanded={open} onClick={() => setOpen((value) => !value)} disabled={busy} title="Plus d’actions" style={{ minWidth: 42, justifyContent: 'center', padding: '8px 10px' }}>
        <MoreVertical size={18} />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Fermer le menu" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20, border: 0, background: 'transparent' }} />
          <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 21, width: 190, padding: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 30px rgba(15,23,42,.14)' }}>
            <Link className="outline" href={`/contacts/${contactId}`} role="menuitem" onClick={() => setOpen(false)} style={{ width: '100%', justifyContent: 'flex-start', border: 0 }}>
              <ExternalLink size={15} /> Voir le contact
            </Link>
            <button type="button" className="outline" role="menuitem" onClick={remove} disabled={busy} style={{ width: '100%', justifyContent: 'flex-start', border: 0 }}>
              <Trash2 size={15} /> {busy ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
