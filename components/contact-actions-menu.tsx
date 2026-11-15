'use client'

import Link from 'next/link'
import { ExternalLink, MoreVertical, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ConikDialog } from '@/components/conik-dialog'

export function ContactActionsMenu({ contactId }: { contactId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    try {
      const response = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(json.error || 'Impossible de supprimer le contact.')
        return
      }
      setConfirmOpen(false)
      setOpen(false)
      router.refresh()
    } catch {
      setError('Une erreur réseau est survenue. Veuillez réessayer.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div style={{ position: 'relative' }}>
        <button type="button" className="outline" aria-label="Actions du contact" aria-expanded={open} onClick={() => setOpen((value) => !value)} disabled={busy} title="Plus d’actions" style={{ minWidth: 42, justifyContent: 'center', padding: '8px 10px' }}>
          <MoreVertical size={18} />
        </button>
        {open && (
          <div className="conik-menu-backdrop" onMouseDown={() => setOpen(false)}>
            <div role="menu" className="conik-action-menu" onMouseDown={(event) => event.stopPropagation()}>
              <div className="conik-action-menu-title">Actions du contact</div>
              <Link className="outline" href={`/contacts/${contactId}`} role="menuitem" onClick={() => setOpen(false)}>
                <ExternalLink size={15} /> Voir le contact
              </Link>
              <button type="button" className="outline" role="menuitem" onClick={() => { setOpen(false); setConfirmOpen(true) }} disabled={busy}>
                <Trash2 size={15} /> Supprimer
              </button>
            </div>
          </div>
        )}
      </div>
      <ConikDialog open={confirmOpen} title="Supprimer ce contact ?" message="Cette action est irréversible. Le contact sera retiré de votre base Conik." tone="danger" confirmLabel="Supprimer" busy={busy} onConfirm={remove} onCancel={() => !busy && setConfirmOpen(false)} />
      <ConikDialog open={!!error} title="Suppression impossible" message={error} tone="danger" confirmLabel="Fermer" onConfirm={() => setError('')} onCancel={() => setError('')} />
    </>
  )
}
