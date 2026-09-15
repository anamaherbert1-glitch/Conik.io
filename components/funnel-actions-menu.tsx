'use client'

import Link from 'next/link'
import { ExternalLink, MoreVertical, Pencil, Trash2, UserRoundPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function FunnelActionsMenu({ funnelId, slug, published }: { funnelId: string; slug: string; published: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function remove() {
    if (!window.confirm('Supprimer ce tunnel ainsi que toutes ses pages et versions ? Cette action est irréversible.')) return
    setBusy(true)
    const response = await fetch(`/api/funnels/${funnelId}`, { method: 'DELETE' })
    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
      window.alert(json.error || 'Impossible de supprimer le tunnel.')
      setBusy(false)
      return
    }
    setOpen(false)
    router.refresh()
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="outline"
        aria-label={`Actions pour ${slug}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        disabled={busy}
        title="Plus d’actions"
        style={{ minWidth: 42, justifyContent: 'center', padding: '8px 10px' }}
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Fermer le menu" onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 20, border: 0, background: 'transparent' }} />
          <div role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 21, width: 220, padding: 6, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 12px 30px rgba(15,23,42,.14)' }}>
            {published && (
              <a className="outline" href={`/${slug}`} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={() => setOpen(false)} style={{ width: '100%', justifyContent: 'flex-start', border: 0 }}>
                <ExternalLink size={15} /> Voir le tunnel
              </a>
            )}
            <Link className="outline" href={`/funnels/${funnelId}`} role="menuitem" onClick={() => setOpen(false)} style={{ width: '100%', justifyContent: 'flex-start', border: 0 }}>
              <ExternalLink size={15} /> Voir les pages
            </Link>
            <Link className="outline" href={`/funnels/${funnelId}/editor`} role="menuitem" onClick={() => setOpen(false)} style={{ width: '100%', justifyContent: 'flex-start', border: 0 }}>
              <Pencil size={15} /> Modifier le tunnel
            </Link>
            <Link className="outline" href={`/funnels/${funnelId}/capture`} role="menuitem" onClick={() => setOpen(false)} style={{ width: '100%', justifyContent: 'flex-start', border: 0 }}>
              <UserRoundPlus size={15} /> Modifier la capture
            </Link>
            <button type="button" className="outline" role="menuitem" onClick={remove} disabled={busy} style={{ width: '100%', justifyContent: 'flex-start', border: 0 }}>
              <Trash2 size={15} /> {busy ? 'Suppression…' : 'Supprimer le tunnel'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
