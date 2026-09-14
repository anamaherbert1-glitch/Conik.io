'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export function CopyPageLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      className="outline"
      onClick={() => void copy()}
      title="Copier le lien public de la page"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copié !' : 'Copier le lien'}
    </button>
  )
}
