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
        {open && <>
          <button type="button" aria-label="Fermer le menu" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20, border: 0, background: 'transparent' }} />
          <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 21, width: 210, padding: 7, background: '#fff', border: '1px solid #e1e4eb', borderRadius: 14, boxShadow: '0 18px 45px rgba(15,23,42,.16)' }}>
            <div style={{ padding: '7px 9px 6px', color: '#98a2b3', fontSize: 9, fontWeight: 900, letterSpacing: '.07em', textTransform: 'uppercase' }}>Actions du contact</div>
            <Link className="outline" href={`/contacts/${contactId}`} role="menuitem" onClick={() => setOpen(false)} style={{ width: '100%', justifyContent: 'flex-start', border: 0, borderRadius: 9 }}>
              <ExternalLink size={15} /> Voir le contact
            </Link>
            <button type="button" className="outline" role="menuitem" onClick={() => setConfirmOpen(true)} disabled={busy} style={{ width: '100%', justifyContent: 'flex-start', border: 0, borderRadius: 9, color: '#dc2626' }}>
              <Trash2 size={15} /> Supprimer
            </button>
          </div>
        </>}
      </div>
      <ConikDialog open={confirmOpen} title="Supprimer ce contact ?" message="Cette action est irréversible. Le contact sera retiré de votre base Conik." tone="danger" confirmLabel="Supprimer" busy={busy} onConfirm={remove} onCancel={() => !busy && setConfirmOpen(false)} />
      <ConikDialog open={!!error} title="Suppression impossible" message={error} tone="danger" confirmLabel="Fermer" onConfirm={() => setError('')} onCancel={() => setError('')} />
    </>
  )
}
