'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Languages, Moon, Sun, Monitor } from 'lucide-react'
import { usePreferences } from '@/components/preferences-provider'
import { locales, type Locale, type Theme } from '@/lib/i18n/dictionaries'

const features = [
  {
    n: '01',
    title: 'Créez vos pages',
    text: 'Pages professionnelles pour présenter une offre, un service, un produit ou votre activité.',
  },
  {
    n: '02',
    title: 'Construisez vos tunnels',
    text: 'Guidez vos visiteurs vers l’action, dans un parcours clair et mesurable.',
  },
  {
    n: '03',
    title: 'Publiez & convertissez',
    text: 'Mettez votre expérience en ligne, récupérez vos prospects et suivez ce qui fonctionne.',
  },
]

const steps = [
  ['01', 'Créer', 'Votre projet', 'Partez de zéro ou importez ce que vous avez déjà.'],
  ['02', 'Personnaliser', 'Votre expérience', 'Adaptez page et parcours à votre objectif.'],
  ['03', 'Publier', 'Votre présence', 'Mettez votre projet en ligne et partagez-le.'],
  ['04', 'Convertir', 'Vos visiteurs', 'Transformez l’attention en prospects et clients.'],
] as const

type Props = {
  alreadyRegistered?: boolean
  email?: string
}

export function LandingPage({ alreadyRegistered, email }: Props) {
  const { theme, setTheme, locale, setLocale, resolvedTheme } = usePreferences()
  const [langOpen, setLangOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  function cycleTheme() {
    const order: Theme[] = ['light', 'dark', 'system']
    const i = order.indexOf(theme)
    setTheme(order[(i + 1) % order.length])
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor

  return (
    <main className={`landing ${isDark ? 'landing-dark' : 'landing-light'}`}>
      <div className="landing-bg" aria-hidden="true">
        <span className="landing-orb landing-orb-a" />
        <span className="landing-orb landing-orb-b" />
        <span className="landing-orb landing-orb-c" />
      </div>

      <header className="landing-nav landing-glass">
        <Link href="/" className="landing-logo">
          <span className="landing-logo-mark">C</span>
          <span>Conik.io</span>
        </Link>

        <nav className="landing-links" aria-label="Navigation">
          <a href="#features">Fonctionnalités</a>
          <a href="#parcours">Parcours</a>
          <a href="#start">Commencer</a>
        </nav>

        <div className="landing-actions">
          <div className="landing-pref">
            <button
              type="button"
              className="landing-icon-btn"
              aria-label="Thème"
              aria-expanded={themeOpen}
              onClick={() => {
                setThemeOpen((v) => !v)
                setLangOpen(false)
              }}
            >
              <ThemeIcon size={16} />
            </button>
            {themeOpen && (
              <div className="landing-menu landing-glass" role="menu">
                {([
                  ['light', 'Clair', Sun],
                  ['dark', 'Sombre', Moon],
                  ['system', 'Système', Monitor],
                ] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    className={`landing-menu-item ${theme === value ? 'active' : ''}`}
                    onClick={() => {
                      setTheme(value)
                      setThemeOpen(false)
                    }}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="landing-pref">
            <button
              type="button"
              className="landing-icon-btn"
              aria-label="Langue"
              aria-expanded={langOpen}
              onClick={() => {
                setLangOpen((v) => !v)
                setThemeOpen(false)
              }}
            >
              <Languages size={16} />
              <span className="landing-lang-code">{locale.toUpperCase()}</span>
            </button>
            {langOpen && (
              <div className="landing-menu landing-glass" role="menu">
                {locales.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    className={`landing-menu-item ${locale === item.code ? 'active' : ''}`}
                    onClick={() => {
                      setLocale(item.code as Locale)
                      setLangOpen(false)
                    }}
                  >
                    {item.native}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="landing-icon-btn landing-theme-quick" onClick={cycleTheme} aria-label="Changer de thème">
            <ThemeIcon size={16} />
          </button>

          <Link href="/login" className="landing-btn landing-ghost">
            Se connecter
          </Link>
          <Link href="/signup" className="landing-btn landing-primary">
            Commencer
          </Link>
        </div>
      </header>

      {alreadyRegistered && (
        <section className="landing-alert landing-glass" role="status">
          <h2>Cette adresse e-mail est déjà inscrite</h2>
          <p>
            {email
              ? `Le compte associé à ${email} existe déjà. Connectez-vous pour accéder à votre espace.`
              : 'Un compte existe déjà avec cette adresse. Connectez-vous pour continuer.'}
          </p>
          <Link
            href={`/login${email ? `?email=${encodeURIComponent(email)}` : ''}`}
            className="landing-btn landing-primary"
          >
            Se connecter
          </Link>
        </section>
      )}

      <section className="landing-hero">
        <div className="landing-badge landing-glass landing-fade-up">Plateforme pour votre présence en ligne</div>
        <h1 className="landing-fade-up landing-delay-1">
          Créez. Publiez.
          <span className="landing-gradient-text"> Convertissez.</span>
        </h1>
        <p className="landing-lead landing-fade-up landing-delay-2">
          Conik vous aide à créer des pages et des tunnels professionnels, à les publier et à transformer vos visiteurs en prospects et clients.
        </p>
        <div className="landing-hero-actions landing-fade-up landing-delay-3">
          <Link href="/signup" className="landing-btn landing-primary landing-btn-lg">
            Commencer gratuitement <span aria-hidden>→</span>
          </Link>
          <a href="#features" className="landing-btn landing-ghost landing-btn-lg">
            Découvrir Conik
          </a>
        </div>
        <p className="landing-hint landing-fade-up landing-delay-4">Aucune compétence technique requise.</p>

        <div className="landing-product landing-glass landing-fade-up landing-delay-5">
          <div className="landing-browserbar">
            <i /><i /><i />
            <span>app.conik.io</span>
          </div>
          <div className="landing-app">
            <aside>
              <strong>
                <span>C</span> Conik
              </strong>
              {['Vue d’ensemble', 'Tunnels', 'Ventes', 'Contacts', 'Analytics'].map((item, i) => (
                <div key={item} className={i === 0 ? 'active' : ''}>
                  {item}
                </div>
              ))}
            </aside>
            <div className="landing-dashboard">
              <div className="landing-dash-head">
                <div>
                  <small>Bonjour</small>
                  <h3>Votre espace Conik</h3>
                </div>
                <span className="landing-mini-btn">+ Créer</span>
              </div>
              <div className="landing-stats">
                <div>
                  <b>1 284</b>
                  <small>Visiteurs</small>
                </div>
                <div>
                  <b>186</b>
                  <small>Prospects</small>
                </div>
                <div>
                  <b>14,5%</b>
                  <small>Conversion</small>
                </div>
              </div>
              <div className="landing-editor">
                <div className="landing-editor-bar">
                  <span>Éditeur de page</span>
                  <em>● Publié</em>
                </div>
                <div className="landing-mock-page">
                  <h4>Votre offre, enfin en ligne.</h4>
                  <p>Une page claire qui présente votre activité et pousse vos visiteurs à agir.</p>
                  <span className="landing-mock-cta">Commencer maintenant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="features">
        <div className="landing-center">
          <label>Pourquoi Conik</label>
          <h2>Tout pour passer de l’idée à l’action</h2>
          <p>Un seul outil pour construire une expérience qui donne envie d’agir.</p>
        </div>
        <div className="landing-cards">
          {features.map((f, idx) => (
            <article key={f.n} className={`landing-glass landing-card landing-fade-up landing-delay-${idx + 1}`}>
              <div className="landing-card-n">{f.n}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="parcours">
        <div className="landing-center">
          <label>Simple par conception</label>
          <h2>Votre parcours avec Conik</h2>
          <p>Quatre étapes. Sans vous demander quoi faire ensuite.</p>
        </div>
        <div className="landing-steps">
          {steps.map(([n, k, title, text], idx) => (
            <article key={n} className={`landing-glass landing-step landing-fade-up landing-delay-${idx + 1}`}>
              <b>
                {n} — {k}
              </b>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta landing-glass" id="start">
        <label>Prêt à commencer ?</label>
        <h2>Votre prochaine page peut être en ligne aujourd’hui</h2>
        <p>Créez votre espace Conik et construisez une présence en ligne qui travaille pour vous.</p>
        <Link href="/signup" className="landing-btn landing-primary landing-btn-lg">
          Commencer gratuitement <span aria-hidden>→</span>
        </Link>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Conik.io</span>
        <div>
          <Link href="/login">Connexion</Link>
          <Link href="/signup">Inscription</Link>
        </div>
      </footer>
    </main>
  )
}
