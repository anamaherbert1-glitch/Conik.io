'use client'

import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

export const CONIK_COUNTRIES = [
  ['TG','Togo','+228','🇹🇬'],['BJ','Bénin','+229','🇧🇯'],['BF','Burkina Faso','+226','🇧🇫'],['CI','Côte d’Ivoire','+225','🇨🇮'],['GN','Guinée','+224','🇬🇳'],['NE','Niger','+227','🇳🇪'],['GH','Ghana','+233','🇬🇭'],['NG','Nigeria','+234','🇳🇬'],['SN','Sénégal','+221','🇸🇳'],['ML','Mali','+223','🇲🇱'],['SL','Sierra Leone','+232','🇸🇱'],['LR','Liberia','+231','🇱🇷'],['CM','Cameroun','+237','🇨🇲'],['CD','RDC','+243','🇨🇩'],['CG','Congo','+242','🇨🇬'],['GA','Gabon','+241','🇬🇦'],['GQ','Guinée équatoriale','+240','🇬🇶'],['MA','Maroc','+212','🇲🇦'],['DZ','Algérie','+213','🇩🇿'],['TN','Tunisie','+216','🇹🇳'],['FR','France','+33','🇫🇷'],['BE','Belgique','+32','🇧🇪'],['CH','Suisse','+41','🇨🇭'],['CA','Canada','+1','🇨🇦'],['US','États-Unis','+1','🇺🇸'],['GB','Royaume-Uni','+44','🇬🇧'],['DE','Allemagne','+49','🇩🇪'],['ES','Espagne','+34','🇪🇸'],['IT','Italie','+39','🇮🇹'],['PT','Portugal','+351','🇵🇹'],['BR','Brésil','+55','🇧🇷'],['IN','Inde','+91','🇮🇳'],['AE','Émirats arabes unis','+971','🇦🇪'],['ZA','Afrique du Sud','+27','🇿🇦'],
] as const

export function ConikCountryPicker({ value, onChange }: { value: string; onChange: (country: typeof CONIK_COUNTRIES[number]) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const selected = CONIK_COUNTRIES.find((country) => country[2] === value) || CONIK_COUNTRIES[0]
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return CONIK_COUNTRIES
    return CONIK_COUNTRIES.filter((country) => `${country[1]} ${country[2]} ${country[0]}`.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 142 }}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen((v) => !v); setQuery('') }} style={{ width: '100%', height: 42, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', border: `1px solid ${open ? '#ff9b59' : '#dfe3ea'}`, borderRadius: 10, background: '#fff', color: '#172033', cursor: 'pointer', boxShadow: open ? '0 0 0 3px rgba(255,107,0,.10)' : 'none' }}>
        <span style={{ fontSize: 19, lineHeight: 1 }}>{selected[3]}</span><span style={{ fontWeight: 800, fontSize: 12 }}>{selected[2]}</span><ChevronDown size={15} style={{ marginLeft: 'auto', opacity: .65, transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && <div role="listbox" style={{ position: 'absolute', left: 0, top: 'calc(100% + 7px)', zIndex: 80, width: 285, maxWidth: 'min(285px, calc(100vw - 36px))', padding: 8, border: '1px solid #e1e4eb', borderRadius: 14, background: '#fff', boxShadow: '0 18px 45px rgba(15,23,42,.18)' }}>
        <div style={{ position: 'relative', marginBottom: 7 }}><Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#98a2b3' }} /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un pays…" style={{ width: '100%', height: 34, boxSizing: 'border-box', padding: '0 10px 0 30px', border: '1px solid #e1e4eb', borderRadius: 8, outline: 'none', fontSize: 11 }} /></div>
        <div style={{ maxHeight: 270, overflowY: 'auto' }}>{filtered.map((country) => <button key={country[0]} type="button" role="option" aria-selected={country[2] === selected[2]} onClick={() => { onChange(country); setOpen(false); setQuery('') }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 8px', border: 0, borderRadius: 8, background: country[2] === selected[2] ? '#fff1e6' : 'transparent', color: '#172033', cursor: 'pointer', textAlign: 'left' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#fff7f0' }} onMouseLeave={(e) => { e.currentTarget.style.background = country[2] === selected[2] ? '#fff1e6' : 'transparent' }}><span style={{ fontSize: 18 }}>{country[3]}</span><span style={{ flex: 1, fontSize: 11, fontWeight: 700 }}>{country[1]}</span><span style={{ fontSize: 10, color: '#667085', fontWeight: 800 }}>{country[2]}</span>{country[2] === selected[2] && <Check size={14} color="#ff6b00" />}</button>)}</div>
        {!filtered.length && <div style={{ padding: 14, textAlign: 'center', color: '#98a2b3', fontSize: 11 }}>Aucun pays trouvé.</div>}
      </div>}
    </div>
  )
}
