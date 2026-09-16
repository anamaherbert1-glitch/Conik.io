'use client'

import { useState } from 'react'
import { getPaymentMethodLogo } from '@/lib/payment-method-logos'
import type { PaymentMethodDefinition } from '@/lib/payment-method-catalog'

type Method = PaymentMethodDefinition & { enabled: boolean; sort_order: number }

export function PaymentMethodSelector({ paymentPageId, providerId, provider, initialMethods }: { paymentPageId: string; providerId: string; provider: string; initialMethods: Method[] }) {
  const [methods, setMethods] = useState<Method[]>(initialMethods)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

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
    setSaving(true); setMessage('')
    try {
      const response = await fetch('/api/payments/pages/methods', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentPageId, providerId, provider, methods: methods.map((m, i) => ({ method_code: m.code, enabled: m.enabled, sort_order: i })) }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.')
      setMessage('Moyens de paiement enregistrés.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Enregistrement impossible.')
    } finally { setSaving(false) }
  }

  return <section style={styles.card}>
    <div><div style={styles.kicker}>MOYENS DE PAIEMENT</div><h3 style={styles.title}>Choisissez les badges à afficher</h3><p style={styles.help}>Les badges actifs apparaîtront sur la page de paiement dans l’ordre ci-dessous.</p></div>
    {!methods.length ? <div style={styles.empty}>Aucun moyen de paiement configuré pour ce prestataire.</div> : <div style={styles.list}>{methods.map((method, index) => {
      const logo = getPaymentMethodLogo(method.code, null)
      return <div key={method.code} style={{ ...styles.row, opacity: method.enabled ? 1 : .55 }}>
        <button type="button" onClick={() => toggle(method.code)} aria-pressed={method.enabled} style={{ ...styles.badge, ...(method.enabled ? styles.active : {}) }}>
          {logo ? <img src={logo} alt="" style={styles.logo}/> : <span style={styles.fallback}>{method.name.slice(0, 2).toUpperCase()}</span>}
          <span>{method.name}</span>
        </button>
        <div style={styles.actions}><button type="button" onClick={() => move(index, -1)} disabled={index === 0}>↑</button><button type="button" onClick={() => move(index, 1)} disabled={index === methods.length - 1}>↓</button></div>
      </div>
    })}</div>}
    <div style={styles.footer}><span style={styles.status}>{message}</span><button type="button" onClick={save} disabled={saving || !methods.length} style={styles.save}>{saving ? 'Enregistrement…' : 'Enregistrer les moyens'}</button></div>
  </section>
}

const styles: Record<string, React.CSSProperties> = {
  card:{padding:20,border:'1px solid #e5e7eb',borderRadius:18,background:'#fff',display:'grid',gap:16},
  kicker:{fontSize:10,fontWeight:800,letterSpacing:'.12em',opacity:.55},title:{margin:'4px 0 0',fontSize:19},help:{margin:'5px 0 0',fontSize:13,color:'#6b7280'},list:{display:'grid',gap:9},row:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:8,border:'1px solid #e5e7eb',borderRadius:12},badge:{display:'inline-flex',alignItems:'center',gap:9,minHeight:52,padding:'7px 12px',border:'1px solid #e5e7eb',borderRadius:10,background:'#fff',fontWeight:700,cursor:'pointer'},active:{border:'2px solid #111827',padding:'6px 11px'},logo:{width:42,height:28,objectFit:'contain'},fallback:{width:42,height:28,display:'grid',placeItems:'center',borderRadius:6,background:'#f3f4f6',fontSize:11},actions:{display:'flex',gap:5},footer:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12},status:{fontSize:12,color:'#059669'},save:{border:0,borderRadius:10,padding:'11px 15px',background:'#111827',color:'#fff',fontWeight:800,cursor:'pointer'},empty:{padding:14,borderRadius:10,background:'#f9fafb',fontSize:13,color:'#6b7280'},
}
