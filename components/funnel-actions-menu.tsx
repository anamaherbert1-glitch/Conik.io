'use client'

import Link from 'next/link'
import { ExternalLink, MoreVertical, Pencil, Trash2, UserRoundPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ConikDialog } from '@/components/conik-dialog'

export function FunnelActionsMenu({ funnelId, slug, published }: { funnelId: string; slug: string; published: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    try {
      const response = await fetch(`/api/funnels/${funnelId}`, { method: 'DELETE' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(json.error || 'Impossible de supprimer le tunnel.')
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
        <button type="button" className="outline" aria-label={`Actions pour ${slug}`} aria-expanded={open} onClick={() => setOpen((value) => !value)} disabled={busy} title="Plus d’actions" style={{ minWidth: 42, justifyContent: 'center', padding: '8px 10px' }}>
          <MoreVertical size={18} />
        </button>
        {open && <>
          <button type="button" aria-label="Fermer le menu" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20, border: 0, background: 'transparent' }} />
          <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 21, width: 235, padding: 7, background: '#fff', border: '1px solid #e1e4eb', borderRadius: 14, boxShadow: '0 18px 45px rgba(15,23,42,.16)' }}>
            <div style={{ padding: '7px 9px 6px', color: '#98a2b3', fontSize: 9, fontWeight: 900, letterSpacing: '.07em', textTransform: 'uppercase' }}>Actions du tunnel</div>
            {published && <a className="outline" href={`/${slug}`} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={() => setOpen(false)} style={{ width: '100%', justifyContent: 'flex-start', border: 0, borderRadius: 9 }}><ExternalLink size={15} /> Voir le tunnel</a>}
            <Link className="outline" href={`/funnels/${funnelId}`} role="menuitem" onClick={() => setOpen(false)} style={{ width: '100%', justifyContent: 'flex-start', border: 0, borderRadius: 9 }}><ExternalLink size={15} /> Voir les pages</Link>
            <Link className="outline" href={`/funnels/${funnelId}/editor`} role="menuitem" onClick={() => setOpen(false)} style={{ width: '100%', justifyContent: 'flex-start', border: 0, borderRadius: 9 }}><Pencil size={15} /> Modifier le tunnel</Link>
            <Link className="outline" href={`/funnels/${funnelId}/capture`} role="menuitem" onClick={() => setOpen(false)} style={{ width: '100%', justifyContent: 'flex-start', border: 0, borderRadius: 9 }}><UserRoundPlus size={15} /> Modifier la capture</Link>
            <button type="button" className="outline" role="menuitem" onClick={() => setConfirmOpen(true)} disabled={busy} style={{ width: '100%', justifyContent: 'flex-start', border: 0, borderRadius: 9, color: '#dc2626' }}><Trash2 size={15} /> Supprimer le tunnel</button>
          </div>
        </>}
      </div>
      <ConikDialog open={confirmOpen} title="Supprimer ce tunnel ?" message="Toutes les pages, versions et données liées à ce tunnel pourront être supprimées. Cette action est irréversible." tone="danger" confirmLabel="Supprimer le tunnel" busy={busy} onConfirm={remove} onCancel={() => !busy && setConfirmOpen(false)} />
      <ConikDialog open={!!error} title="Suppression impossible" message={error} tone="danger" confirmLabel="Fermer" onConfirm={() => setError('')} onCancel={() => setError('')} />
    </>
  )
}
