'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  BookOpen,
  Zap,
  Users,
  Tags,
  Send,
  Bot,
  MessageSquare,
  MousePointer2,
  BarChart3,
  Globe2,
  Settings2,
  CheckCircle2,
  ArrowRight,
  Plus,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'

type StepId =
  | 'overview'
  | 'funnels'
  | 'tags'
  | 'campaigns'
  | 'automations'
  | 'whatsapp'
  | 'links'
  | 'analytics'
  | 'domains'
  | 'settings'

const STEPS: { id: StepId; title: string; icon: React.ElementType }[] = [
  { id: 'overview', title: "Vue d'ensemble", icon: BookOpen },
  { id: 'funnels', title: 'Creer un funnel', icon: Zap },
  { id: 'tags', title: 'Tags & contacts', icon: Tags },
  { id: 'campaigns', title: 'Campagnes', icon: Send },
  { id: 'automations', title: 'Automatisations', icon: Bot },
  { id: 'whatsapp', title: 'WhatsApp', icon: MessageSquare },
  { id: 'links', title: 'Liens courts', icon: MousePointer2 },
  { id: 'analytics', title: 'Analytique', icon: BarChart3 },
  { id: 'domains', title: 'Domaines', icon: Globe2 },
  { id: 'settings', title: 'Parametres', icon: Settings2 },
]

function MockFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="tut-mock">
      <div className="tut-mock-bar">
        <span className="tut-dot" />
        <span className="tut-dot" />
        <span className="tut-dot" />
        <small>{title}</small>
      </div>
      <div className="tut-mock-body">{children}</div>
    </div>
  )
}

function StepCard({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="tut-step-card">
      <span className="tut-step-num">{n}</span>
      <div>
        <b>{title}</b>
        <p>{text}</p>
      </div>
    </div>
  )
}

export default function TutorialPage() {
  const [active, setActive] = useState<StepId>('overview')

  return (
    <AppShell active="Tutorial">
      <header>
        <div>
          <small>AIDE</small>
          <h1>Tutoriel Conik.io</h1>
          <p className="muted">Parcours complet : funnels, tags, campagnes et toute la plateforme.</p>
        </div>
        <Link className="outline" href="/dashboard">
          Retour au tableau de bord
        </Link>
      </header>

      <div className="tut-layout">
        <nav className="tut-nav panel">
          {STEPS.map(({ id, title, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={active === id ? 'tut-nav-item active' : 'tut-nav-item'}
              onClick={() => setActive(id)}
            >
              <Icon size={16} />
              {title}
            </button>
          ))}
        </nav>

        <div className="tut-content">
          {active === 'overview' && (
            <section className="panel tut-section">
              <h2>Comment Conik.io s'articule</h2>
              <p className="muted">
                Conik est un Marketing OS : vous creez des <b>tunnels (funnels)</b> pour capturer des leads,
                vous organisez les contacts avec des <b>tags</b>, vous lancez des <b>campagnes</b> et des{' '}
                <b>automatisations</b>, puis vous mesurez le tout.
              </p>
              <div className="tut-flow">
                <span>1. Funnel</span>
                <ArrowRight size={16} />
                <span>2. Contact + tags</span>
                <ArrowRight size={16} />
                <span>3. Campagne / Auto</span>
                <ArrowRight size={16} />
                <span>4. Analytics</span>
              </div>
              <MockFrame title="Tableau de bord">
                <div className="tut-dash">
                  <div className="tut-stat">Contacts</div>
                  <div className="tut-stat">Tunnels</div>
                  <div className="tut-stat">Visiteurs</div>
                  <div className="tut-stat">CA</div>
                </div>
              </MockFrame>
              <Link className="primary" href="/funnels/new">
                <Plus size={16} /> Commencer par un tunnel
              </Link>
            </section>
          )}

          {active === 'funnels' && (
            <section className="panel tut-section">
              <h2>Creer et configurer un funnel</h2>
              <p className="muted">
                Un funnel = un tunnel de pages (landing, opt-in, thank-you) heberge par Conik. Les formulaires
                envoient les leads dans votre CRM.
              </p>
              <StepCard n={1} title="Ouvrir Tunnels" text="Menu lateral vers Funnels. Liste + deux modes de creation." />
              <StepCard n={2} title="Creer un tunnel vide" text="Nouveau tunnel : nom + slug (ex. offre-ete)." />
              <StepCard n={3} title="Ou importer un ZIP" text="ZIP HTML/CSS/images. Conik valide, nettoie et heberge." />
              <StepCard n={4} title="Editeur de pages" text="Ouvrez le tunnel puis Editeur. Pages, HTML/CSS, preview, publier." />
              <StepCard n={5} title="Publication" text="Statut publie. URL publique : /votre-slug sur Conik." />
              <div className="tut-mocks-row">
                <MockFrame title="Funnels liste">
                  <div className="tut-list-row">
                    <b>Offre ete</b>
                    <span className="status published">publie</span>
                  </div>
                  <div className="tut-list-row">
                    <b>Webinaire</b>
                    <span className="status">brouillon</span>
                  </div>
                  <div className="tut-btns">
                    <span className="primary">+ Nouveau</span>
                    <span className="outline">ZIP</span>
                  </div>
                </MockFrame>
                <MockFrame title="Editeur">
                  <div className="tut-editor">
                    <div className="tut-pages">
                      <div className="page-item active">
                        <span>Accueil</span>
                        <small>home</small>
                      </div>
                      <div className="page-item">
                        <span>Merci</span>
                        <small>thanks</small>
                      </div>
                    </div>
                    <div className="tut-preview">Apercu de la page</div>
                  </div>
                </MockFrame>
              </div>
              <div className="button-row">
                <Link className="primary" href="/funnels/new">
                  Creer un tunnel
                </Link>
                <Link className="outline" href="/funnels">
                  Voir mes tunnels
                </Link>
              </div>
            </section>
          )}

          {active === 'tags' && (
            <section className="panel tut-section">
              <h2>Tags (etiquettes) et contacts</h2>
              <p className="muted">
                Les tags classent vos leads (ex. <b>lead-chaud</b>, <b>webinar-juin</b>). Ils alimentent
                segments, campagnes et automatisations.
              </p>
              <StepCard n={1} title="Contacts" text="Menu Contacts : tous les leads captures par vos formulaires." />
              <StepCard n={2} title="Fiche contact" text="Ouvrez un contact : email, statut, section Etiquettes." />
              <StepCard n={3} title="Creer un tag" text="Nom du tag puis Creer et ajouter. Cree et assigne en une fois." />
              <StepCard n={4} title="Assigner / retirer" text="Liste deroulante puis Ajouter. Cliquez x sur un badge pour retirer." />
              <StepCard n={5} title="Bonnes pratiques" text="Noms courts : source-instagram, funnel-offre-ete." />
              <MockFrame title="Fiche contact tags">
                <div className="tut-tags">
                  <span className="badge">lead-chaud x</span>
                  <span className="badge">webinar-juin x</span>
                  <span className="primary">Ajouter</span>
                </div>
              </MockFrame>
              <Link className="primary" href="/contacts">
                <Users size={16} /> Ouvrir les contacts
              </Link>
            </section>
          )}

          {active === 'campaigns' && (
            <section className="panel tut-section">
              <h2>Creer une campagne</h2>
              <p className="muted">
                Une campagne = une intention marketing (lancement, relance) eventuellement liee a un funnel.
              </p>
              <StepCard n={1} title="Menu Campagnes" text="Liste (brouillon, active, pausee, archivee)." />
              <StepCard n={2} title="Nouvelle campagne" text="Nom obligatoire, tunnel facultatif, statut initial draft." />
              <StepCard n={3} title="Lier un tunnel" text="Rattachez la campagne a un funnel de conversion." />
              <StepCard n={4} title="Suivi" text="Ouvrez la fiche pour changer le statut plus tard." />
              <MockFrame title="Nouvelle campagne">
                <label className="form-label">
                  Nom
                  <input className="form-input" defaultValue="Lancement offre ete" readOnly />
                </label>
                <label className="form-label">
                  Tunnel
                  <select className="form-input" disabled>
                    <option>Offre ete</option>
                  </select>
                </label>
                <span className="primary">Creer la campagne</span>
              </MockFrame>
              <div className="button-row">
                <Link className="primary" href="/campaigns/new">
                  Nouvelle campagne
                </Link>
                <Link className="outline" href="/campaigns">
                  Liste des campagnes
                </Link>
              </div>
            </section>
          )}

          {active === 'automations' && (
            <section className="panel tut-section">
              <h2>Automatisations</h2>
              <p className="muted">Declencheur puis actions (message, delai). Execution via le cron Conik.</p>
              <StepCard n={1} title="Creer" text="Automatisations puis Nouvelle. Nommez le scenario." />
              <StepCard n={2} title="Declencheur" text="Evenement qui demarre le flux (contact, tag, etc.)." />
              <StepCard n={3} title="Actions" text="Ajoutez les etapes dans l ordre." />
              <StepCard n={4} title="Activer" text="Passez le statut a active." />
              <Link className="primary" href="/automations/new">
                Creer une automatisation
              </Link>
            </section>
          )}

          {active === 'whatsapp' && (
            <section className="panel tut-section">
              <h2>WhatsApp Business</h2>
              <p className="muted">Connexion Meta Embedded Signup, templates et conversations par organisation.</p>
              <StepCard n={1} title="Variables Meta" text="Vercel : META_APP_ID, SECRET, CONFIG_ID, secrets webhook." />
              <StepCard n={2} title="Connecter" text="Page WhatsApp puis bouton Meta puis autoriser le Business." />
              <StepCard n={3} title="Templates" text="Modeles approuves Meta + fils entrants." />
              <Link className="primary" href="/whatsapp">
                Ouvrir WhatsApp
              </Link>
            </section>
          )}

          {active === 'links' && (
            <section className="panel tut-section">
              <h2>Liens courts</h2>
              <p className="muted">Slugs trackes (clics) vers une URL ou un funnel.</p>
              <StepCard n={1} title="Creer" text="Liens : slug + destination." />
              <StepCard n={2} title="Suivi" text="Chaque clic est enregistre pour l analytique." />
              <Link className="primary" href="/links">
                Gerer les liens
              </Link>
            </section>
          )}

          {active === 'analytics' && (
            <section className="panel tut-section">
              <h2>Analytique</h2>
              <p className="muted">Trafic, formulaires, conversions — complete le tableau de bord.</p>
              <Link className="primary" href="/analytics">
                Ouvrir Analytics
              </Link>
            </section>
          )}

          {active === 'domains' && (
            <section className="panel tut-section">
              <h2>Domaines personnalises</h2>
              <p className="muted">Hostname lie a un funnel (DNS puis verification : pending / verified).</p>
              <Link className="primary" href="/domains">
                Gerer les domaines
              </Link>
            </section>
          )}

          {active === 'settings' && (
            <section className="panel tut-section">
              <h2>Parametres</h2>
              <p className="muted">Theme clair/sombre, langue FR EN AR ZH, nom de l organisation.</p>
              <div className="tut-checklist">
                <div>
                  <CheckCircle2 size={16} /> Theme
                </div>
                <div>
                  <CheckCircle2 size={16} /> Langue
                </div>
                <div>
                  <CheckCircle2 size={16} /> Entreprise
                </div>
              </div>
              <Link className="primary" href="/settings">
                Ouvrir les parametres
              </Link>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  )
}
