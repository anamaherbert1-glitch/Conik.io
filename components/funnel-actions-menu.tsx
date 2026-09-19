'use client'

import Link from 'next/link'
import { ExternalLink, MoreVertical, Pencil, Trash2, UserRoundPlus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ConikDialog } from '@/components/conik-dialog'

export function FunnelActionsMenu({ funnelId, slug, published }: { funnelId: string; slug: string; published: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

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

  const itemStyle: React.CSSProperties = {
    width: '100%',
    justifyContent: 'flex-start',
    border: 0,
    borderRadius: 10,
    minHeight: 44,
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
    background: 'transparent',
    color: 'inherit',
    fontWeight: 650,
    fontSize: 14,
    cursor: 'pointer',
  }

  return (
    <>
      <button
        type="button"
        className="outline"
        aria-label={`Actions pour ${slug}`}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        disabled={busy}
        title="Plus d’actions"
        style={{ minWidth: 42, placeContent: 'center', padding: '8px 10px' }}
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'grid',
            placeItems: 'end center',
            padding: 12,
            background: 'rgba(15,23,42,.48)',
            backdropFilter: 'blur(4px)',
          }}
          onMouseDown={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Actions du tunnel"
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              width: 'min(400px, 100%)',
              borderRadius: 18,
              background: 'var(--panel, #fff)',
              border: '1px solid var(--line, #e5e7eb)',
              boxShadow: '0 24px 70px rgba(15,23,42,.24)',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 8px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                Actions du tunnel
              </div>
              <button
                type="button"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
                style={{
                  width: 34,
                  height: 34,
                  border: 0,
                  borderRadius: 9,
                  background: 'var(--bg, #f6f7f9)',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <X size={17} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 2, padding: '4px 8px 12px' }}>
              {published && (
                <a
                  className="outline"
                  href={`/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  style={{ ...itemStyle, border: 0 }}
                >
                  <ExternalLink size={16} /> Voir le tunnel
                </a>
              )}
              <Link className="outline" href={`/funnels/${funnelId}`} onClick={() => setOpen(false)} style={{ ...itemStyle, border: 0 }}>
                <ExternalLink size={16} /> Voir les pages
              </Link>
              <Link className="outline" href={`/funnels/${funnelId}/editor`} onClick={() => setOpen(false)} style={{ ...itemStyle, border: 0 }}>
                <Pencil size={16} /> Modifier le tunnel
              </Link>
              <Link className="outline" href={`/funnels/${funnelId}/capture`} onClick={() => setOpen(false)} style={{ ...itemStyle, border: 0 }}>
                <UserRoundPlus size={16} /> Modifier la capture
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setConfirmOpen(true)
                }}
                style={{ ...itemStyle, color: '#dc2626' }}
              >
                <Trash2 size={16} /> Supprimer le tunnel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConikDialog
        open={confirmOpen}
        title="Supprimer ce tunnel ?"
        message="Toutes les pages, versions et données liées à ce tunnel pourront être supprimées. Cette action est irréversible."
        tone="danger"
        confirmLabel="Supprimer le tunnel"
        busy={busy}
        onConfirm={() => void remove()}
        onCancel={() => {
          if (!busy) setConfirmOpen(false)
        }}
      />
      <ConikDialog
        open={!!error}
        title="Suppression impossible"
        message={error}
        tone="danger"
        confirmLabel="Fermer"
        onConfirm={() => setError('')}
        onCancel={() => setError('')}
      />
    </>
  )
}
