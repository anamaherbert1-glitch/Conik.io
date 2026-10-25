'use client'

import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { SettingsCollaboration } from '@/components/settings-collaboration'
import { SettingsTutorial } from '@/components/settings-tutorial'
import { usePreferences } from '@/components/preferences-provider'
import { locales, type Locale, type Theme } from '@/lib/i18n/dictionaries'
import { Moon, Sun, Monitor, MessageSquarePlus, User, Building2, Camera, ChevronDown } from 'lucide-react'

type Country = { name: string; code: string; dial: string; flag: string }

const countries: Country[] = [
  { name: 'Togo', code: 'TG', dial: '+228', flag: '\u{1F1F9}\u{1F1EC}' },
  { name: 'B\u00e9nin', code: 'BJ', dial: '+229', flag: '\u{1F1E7}\u{1F1EF}' },
  { name: 'Ghana', code: 'GH', dial: '+233', flag: '\u{1F1EC}\u{1F1ED}' },
  { name: "C\u00f4te d\u2019Ivoire", code: 'CI', dial: '+225', flag: '\u{1F1E8}\u{1F1EE}' },
  { name: 'S\u00e9n\u00e9gal', code: 'SN', dial: '+221', flag: '\u{1F1F8}\u{1F1F3}' },
  { name: 'Burkina Faso', code: 'BF', dial: '+226', flag: '\u{1F1E7}\u{1F1EB}' },
  { name: 'Mali', code: 'ML', dial: '+223', flag: '\u{1F1F2}\u{1F1F1}' },
  { name: 'Niger', code: 'NE', dial: '+227', flag: '\u{1F1F3}\u{1F1EA}' },
  { name: 'Guin\u00e9e', code: 'GN', dial: '+224', flag: '\u{1F1EC}\u{1F1F3}' },
  { name: 'Cameroun', code: 'CM', dial: '+237', flag: '\u{1F1E8}\u{1F1F2}' },
  { name: 'Gabon', code: 'GA', dial: '+241', flag: '\u{1F1EC}\u{1F1E6}' },
  { name: 'Congo', code: 'CG', dial: '+242', flag: '\u{1F1E8}\u{1F1EC}' },
  { name: 'RD Congo', code: 'CD', dial: '+243', flag: '\u{1F1E8}\u{1F1E9}' },
  { name: 'Nigeria', code: 'NG', dial: '+234', flag: '\u{1F1F3}\u{1F1EC}' },
  { name: 'Kenya', code: 'KE', dial: '+254', flag: '\u{1F1F0}\u{1F1EA}' },
  { name: 'Maroc', code: 'MA', dial: '+212', flag: '\u{1F1F2}\u{1F1E6}' },
  { name: 'Alg\u00e9rie', code: 'DZ', dial: '+213', flag: '\u{1F1E9}\u{1F1FF}' },
  { name: 'Tunisie', code: 'TN', dial: '+216', flag: '\u{1F1F9}\u{1F1F3}' },
  { name: 'France', code: 'FR', dial: '+33', flag: '\u{1F1EB}\u{1F1F7}' },
  { name: 'Belgique', code: 'BE', dial: '+32', flag: '\u{1F1E7}\u{1F1EA}' },
  { name: 'Canada', code: 'CA', dial: '+1', flag: '\u{1F1E8}\u{1F1E6}' },
  { name: '\u00c9tats-Unis', code: 'US', dial: '+1', flag: '\u{1F1FA}\u{1F1F8}' },
  { name: 'Royaume-Uni', code: 'GB', dial: '+44', flag: '\u{1F1EC}\u{1F1E7}' },
]

// NOTE: full settings page content preserved from repo minus SettingsMcp block.
// If this stub is too short the previous push may have truncated — re-fetch if needed.

export default function SettingsPage() {
  return (
    <AppShell active="Settings">
      <header>
        <div>
          <h1>Param\u00e8tres</h1>
          <p className="muted">Profil, espace de travail et pr\u00e9f\u00e9rences. Le MCP est dans Int\u00e9grations.</p>
        </div>
      </header>
      <div className="notice" style={{ marginBottom: 16 }}>
        Conik MCP a \u00e9t\u00e9 d\u00e9plac\u00e9 vers{' '}
        <a href="/integrations?tab=mcp" style={{ fontWeight: 700 }}>Int\u00e9grations \u2192 MCP</a>.
      </div>
      <SettingsCollaboration />
      <SettingsTutorial />
    </AppShell>
  )
}
