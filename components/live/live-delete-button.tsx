'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ConikDialog } from '@/components/conik-dialog'

export function LiveDeleteButton({ liveId, title, onDeleted }: { liveId: string; title?: string; onDeleted?: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function remove() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/lives/${liveId}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error || 'Impossible de supprimer ce Live.')
        return
      }
      setOpen(false)
      onDeleted?.()
      router.refresh()
    } catch {
      setError('Une erreur réseau est survenue. Veuillez réessayer.')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <button className="outline" type="button" onClick={() => setOpen(true)} title="Supprimer le Live" aria-label={`Supprimer ${title || 'ce Live'}`}>
      <Trash2 size={15} /> Supprimer
    </button>
    <ConikDialog
      open={open}
      title="Supprimer ce Live ?"
      message={`« ${title || 'Ce Live'} » est terminé. Son événement et ses données de participation seront supprimés définitivement.`}
      tone="danger"
      confirmLabel="Supprimer le Live"
      busy={busy}
      onConfirm={remove}
      onCancel={() => !busy && setOpen(false)}
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
}
