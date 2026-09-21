'use client'

import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export function SettingsTutorial() {\n  const { dict } = usePreferences()\n  const t = dict.common
  return (
    <section className="panel settings-section" id="tutorial">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <BookOpen size={18} />
        <h3 style={{ margin: 0 }} >{t.tutorial}</h3>
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        {t.tutorialHint}
      </p>
      <Link href="/tutorial" className="primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
        {t.openGuide}
      </Link>
    </section>
  )
}
