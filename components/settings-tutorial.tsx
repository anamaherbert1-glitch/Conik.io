'use client'

import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export function SettingsTutorial() {
  return (
    <section className="panel settings-section" id="tutorial">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <BookOpen size={18} />
        <h3 style={{ margin: 0 }}>Tutoriel</h3>
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
        Apprenez à créer un tunnel, importer un site HTML, connecter un paiement et publier.
      </p>
      <Link href="/tutorial" className="primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
        Ouvrir le guide complet
      </Link>
    </section>
  )
}
