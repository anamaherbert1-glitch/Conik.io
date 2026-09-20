'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Row = {
  product_code: string
  plan_code: string
  product_type: string
  price: number
  daily_price: number | null
  currency: string
  active: boolean
}

export function PricingForm({ initial }: { initial: Array<Record<string, unknown>> }) {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>(
    initial.map((r) => ({
      product_code: String(r.product_code),
      plan_code: String(r.plan_code),
      product_type: String(r.product_type),
      price: Number(r.price || 0),
      daily_price: r.daily_price == null ? null : Number(r.daily_price),
      currency: String(r.currency || 'XOF'),
      active: Boolean(r.active ?? true),
    })),
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  async function save() {
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsg(j.error || 'Erreur de sauvegarde')
        return
      }
      setMsg('Tarifs enregistrés.')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Plan</th>
            <th>Prix (30j / forfait)</th>
            <th>Prix / jour</th>
            <th>Devise</th>
            <th>Actif</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.product_code}>
              <td>
                <strong>{r.product_code}</strong>
                <div className="muted" style={{ fontSize: 11 }}>
                  {r.product_type}
                </div>
              </td>
              <td>{r.plan_code}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={r.price}
                  onChange={(e) => update(i, { price: Number(e.target.value) })}
                  style={{ width: 120 }}
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={r.daily_price ?? ''}
                  placeholder="—"
                  onChange={(e) =>
                    update(i, { daily_price: e.target.value === '' ? null : Number(e.target.value) })
                  }
                  style={{ width: 120 }}
                />
              </td>
              <td>
                <input
                  value={r.currency}
                  onChange={(e) => update(i, { currency: e.target.value })}
                  style={{ width: 80 }}
                />
              </td>
              <td>
                <input type="checkbox" checked={r.active} onChange={(e) => update(i, { active: e.target.checked })} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="admin-actions">
        <button type="button" className="primary" disabled={saving} onClick={() => void save()}>
          {saving ? 'Enregistrement…' : 'Enregistrer les tarifs'}
        </button>
        {msg && <span className="muted">{msg}</span>}
      </div>
    </div>
  )
}
