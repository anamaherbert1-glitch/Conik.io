'use client'

import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { ReactNode } from 'react'

type DialogTone = 'danger' | 'warning' | 'info' | 'success'

export function ConikDialog({
  open,
  title,
  message,
  tone = 'info',
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  busy = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean
  title: string
  message?: string
  tone?: DialogTone
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  onConfirm?: () => void
  onCancel: () => void
  children?: ReactNode
}) {
  if (!open) return null
  const Icon = tone === 'danger' ? AlertTriangle : tone === 'success' ? CheckCircle2 : tone === 'warning' ? AlertTriangle : Info
  return (
    <div className="conik-dialog-backdrop" onMouseDown={onCancel}>
      <div className="conik-dialog" role="dialog" aria-modal="true" aria-labelledby="conik-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="conik-dialog-head">
          <div className={`conik-dialog-icon ${tone}`}><Icon size={20} /></div>
          <div className="conik-dialog-copy">
            <h2 id="conik-dialog-title">{title}</h2>
            {message && <p>{message}</p>}
          </div>
          <button type="button" className="conik-dialog-x" onClick={onCancel} aria-label="Fermer"><X size={17} /></button>
        </div>
        {children && <div className="conik-dialog-content">{children}</div>}
        <div className="conik-dialog-actions">
          <button type="button" className="outline" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          {onConfirm && <button type="button" className={tone === 'danger' ? 'danger-button' : 'primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Traitement…' : confirmLabel}</button>}
        </div>
      </div>
    </div>
  )
}
