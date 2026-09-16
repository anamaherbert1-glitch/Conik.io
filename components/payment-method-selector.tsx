'use client'

import { useEffect, useState } from 'react'
import { getPaymentMethodLogo } from '@/lib/payment-method-logos'
import type { PaymentMethodDefinition } from '@/lib/payment-method-catalog'

type Method = PaymentMethodDefinition & { enabled: boolean; sort_order: number }

type Props = {
  paymentPageId: string
  providerId: string
  provider: string
}

export function PaymentMethodSelector({ paymentPageId, providerId, provider }: Props) {
  const [methods, setMethods] = useState<Method[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setMessage('')
      try {
        const response = await fetch(`/api/payments/pages/methods?paymentPageId=${encodeURIComponent(paymentPageId)}&provider=${encodeURIComponent(provider)}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Chargement impossible.')
        const saved = new Map<string, any>((data.methods || []).map((m: any) => [m.method_code, m]))
        const next = (data.catalog || []).map((definition: PaymentMethodDefinition, index: number) => {
          const existing = saved.get(definition.code)
          return {
            ...definition,
            enabled: existing ? Boolean(existing.enabled) : true,
            sort_order: existing ? Number(existing.sort_order) : index,
          }
        }).sort((a: Method, b: Method) => a.sort_order - b.sort_order)
        if (!cancelled) setMethods(next)
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : 'Chargement impossible.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [paymentPageId, provider])

  function toggle(code: string) {
    setMethods(current => current.map(m => m.code === code ? { ...m, enabled: !m.enabled } : m))
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction
    if (next < 0 || next >= methods.length) return
    setMethods(current => {
      const copy = [...current]
      ;[copy[index], copy[next]] = [copy[next], copy[index]]
      return copy.map((m, i) => ({ ...m, sort_order: i }))
    })
  }

  async function save() {
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/payments/pages/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentPageId,
          providerId,
          provider,
          methods: methods.map((m, i) => ({ method_code: m.code, enabled: m.enabled, sort_order: i })),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.')
      setMessage('Moyens de paiement enregistrés.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section style={styles.card}>
      <div>
        <div style={styles.kicker}>MOYENS DE PAIEMENT</div>
        <h3 style={styles.title}>Choisissez les badges à afficher</h3>
        <p style={styles.help}>Activez, désactivez et réordonnez les moyens disponibles chez ce prestataire.</p>
      </div>
      {loading ? <div style={styles.empty}>Chargement des moyens de paiement…</div> : !methods.length ? <div style={styles.empty}>Aucun moyen de paiement disponible pour ce prestataire.</div> : (
        <div style={styles.list}>
          {methods.map((method, index) => {
            const logo = getPaymentMethodLogo(method.code, null)
            return (
              <div key={method.code} style={{ ...styles.row, opacity: method.enabled ? 1 : .55 }}>
                <button type="button" onClick={() => toggle(method.code)} aria-pressed={method.enabled} style={{ ...styles.badge, ...(method.enabled ? styles.active : {}) }}>
                  {logo ? <img src={logo} alt="" style={styles.logo} /> : <span style={styles.fallback}>{method.name.slice(0, 2).toUpperCase()}</span>}
                  <span>{method.name}</span>
                  <span style={styles.state}>{method.enabled ? 'Actif' : 'Masqué'}</span>
                </button>
                <div style={styles.actions}>
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Monter">↑</button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === methods.length - 1} aria-label="Descendre">↓</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div style={styles.footer}>
        <span style={styles.status}>{message}</span>
        <button type="button" onClick={save} disabled={saving || loading || !methods.length} style={styles.save}>{saving ? 'Enregistrement…' : 'Enregistrer les moyens'}</button>
      </div>
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: { padding: 20, border: '1px solid #e5e7eb', borderRadius: 18, background: '#fff', display: 'grid', gap: 16 },
  kicker: { fontSize: 10, fontWeight: 800, letterSpacing: '.12em', opacity: .55 },
  title: { margin: '4px 0 0', fontSize: 19 },
  help: { margin: '5px 0 0', fontSize: 13, color: '#6b7280' },
  list: { display: 'grid', gap: 9 },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 8, border: '1px solid #e5e7eb', borderRadius: 12 },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 9, minHeight: 52, padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', fontWeight: 700, cursor: 'pointer', flex: 1, textAlign: 'left' },
  active: { border: '2px solid #111827', padding: '6px 11px' },
  logo: { width: 42, height: 28, objectFit: 'contain' },
  fallback: { width: 42, height: 28, display: 'grid', placeItems: 'center', borderRadius: 6, background: '#f3f4f6', fontSize: 11 },
  state: { marginLeft: 'auto', fontSize: 11, color: '#6b7280' },
  actions: { display: 'flex', gap: 5 },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  status: { fontSize: 12, color: '#059669' },
  save: { border: 0, borderRadius: 10, padding: '11px 15px', background: '#111827', color: '#fff', fontWeight: 800, cursor: 'pointer' },
  empty: { padding: 14, borderRadius: 10, background: '#f9fafb', fontSize: 13, color: '#6b7280' },
}
