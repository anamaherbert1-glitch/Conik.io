'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getDictionary, locales, type Dictionary, type Locale, type Theme } from '@/lib/i18n/dictionaries'

type PreferencesContextValue = {
  locale: Locale
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  dict: Dictionary
  setLocale: (locale: Locale) => void
  setTheme: (theme: Theme) => void
  dir: 'ltr' | 'rtl'
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

const LOCALE_KEY = 'conik.locale'
const THEME_KEY = 'conik.theme'

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const storedLocale = localStorage.getItem(LOCALE_KEY) as Locale | null
      const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null
      if (storedLocale && locales.some((l) => l.code === storedLocale)) setLocaleState(storedLocale)
      if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') setThemeState(storedTheme)
    } catch {
      // ignore
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    const next = resolveTheme(theme)
    setResolvedTheme(next)
    document.documentElement.dataset.theme = next
    document.documentElement.classList.toggle('dark', next === 'dark')
    const meta = document.querySelector('meta[name="color-scheme"]')
    if (meta) meta.setAttribute('content', next)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme, ready])

  useEffect(() => {
    if (!ready) return
    const info = locales.find((l) => l.code === locale) || locales[0]
    document.documentElement.lang = locale
    document.documentElement.dir = info.dir
    try {
      localStorage.setItem(LOCALE_KEY, locale)
    } catch {
      // ignore
    }
  }, [locale, ready])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setResolvedTheme(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setLocale = useCallback((value: Locale) => setLocaleState(value), [])
  const setTheme = useCallback((value: Theme) => setThemeState(value), [])

  const dict = useMemo(() => getDictionary(locale), [locale])
  const dir = locales.find((l) => l.code === locale)?.dir || 'ltr'

  const value = useMemo(
    () => ({ locale, theme, resolvedTheme, dict, setLocale, setTheme, dir }),
    [locale, theme, resolvedTheme, dict, setLocale, setTheme, dir],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}
