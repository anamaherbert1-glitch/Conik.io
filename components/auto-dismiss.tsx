'use client'

import { useEffect } from 'react'

/** Fait disparaître un message après `ms` ms en appelant `onClear`. */
export function useAutoDismiss(value: string, onClear: () => void, ms = 4000) {
  useEffect(() => {
    if (!value) return
    const t = window.setTimeout(() => onClear(), ms)
    return () => window.clearTimeout(t)
  }, [value, onClear, ms])
}
