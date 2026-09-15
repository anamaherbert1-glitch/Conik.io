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
  const accent = tone === 'danger' ? '#dc2626' : tone === 'success' ? '#16a34a' : '#ff6b00'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 18, background: 'rgba(15,23,42,.48)', backdropFilter: 'blur(4px)' }} onMouseDown={onCancel}>
      <div role="dialog" aria-modal="true" aria-labelledby="conik-dialog-title" onMouseDown={(event) => event.stopPropagation()} style={{ width: 'min(440px,100%)', borderRadius: 18, background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 24px 70px rgba(15,23,42,.24)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 18px 12px' }}>
          <div style={{ flex: '0 0 40px', width: 40, height: 40, display: 'grid', placeItems: 'center', borderRadius: 12, background: `${accent}14`, color: accent }}><Icon size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="conik-dialog-title" style={{ margin: 0, color: '#111827', fontSize: 17, lineHeight: 1.3 }}>{title}</h2>
            {message && <p style={{ margin: '7px 0 0', color: '#667085', fontSize: 13, lineHeight: 1.5 }}>{message}</p>}
          </div>
          <button type="button" onClick={onCancel} aria-label="Fermer" style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, border: 0, borderRadius: 9, background: '#f6f7f9', color: '#667085', cursor: 'pointer' }}><X size={17} /></button>
        </div>
        {children && <div style={{ padding: '0 18px 16px' }}>{children}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 18px 18px', borderTop: '1px solid #eef0f4' }}>
          <button type="button" onClick={onCancel} disabled={busy} style={{ minHeight: 38, padding: '0 14px', borderRadius: 9, border: '1px solid #dfe3ea', background: '#fff', color: '#475467', fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer' }}>{cancelLabel}</button>
          {onConfirm && <button type="button" onClick={onConfirm} disabled={busy} style={{ minHeight: 38, padding: '0 15px', borderRadius: 9, border: `1px solid ${accent}`, background: accent, color: '#fff', fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .65 : 1 }}>{busy ? 'Traitement…' : confirmLabel}</button>}
        </div>
      </div>
    </div>
  )
}
