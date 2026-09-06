'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  BookOpen, Zap, Users, Tags, Send, Bot, MessageSquare, MousePointer2,
  BarChart3, Globe2, Settings2, CheckCircle2, ArrowRight, Plus, AlertCircle,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'

type StepId = 'overview' | 'start' | 'funnels' | 'tags' | 'campaigns' | 'automations' | 'whatsapp' | 'links' | 'analytics' | 'domains' | 'settings'

const STEPS: { id: StepId; title: string; icon: React.ElementType }[] = [
  { id: 'overview', title: "Vue d'ensemble", icon: BookOpen },
  { id: 'start', title: 'Premiers pas', icon: CheckCircle2 },
  { id: 'funnels', title: 'Tunnels (funnels)', icon: Zap },
  { id: 'tags', title: 'Contacts et tags', icon: Tags },
  { id: 'campaigns', title: 'Campagnes', icon: Send },
  { id: 'automations', title: 'Automatisations', icon: Bot },
  { id: 'whatsapp', title: 'WhatsApp', icon: MessageSquare },
  { id: 'links', title: 'Liens courts', icon: MousePointer2 },
  { id: 'analytics', title: 'Analytique', icon: BarChart3 },
  { id: 'domains', title: 'Domaines', icon: Globe2 },
  { id: 'settings', title: 'Parametres', icon: Settings2 },
]

function Result({ children }: { children: React.ReactNode }) {
  return (
    <div className="tut-result">
      <CheckCircle2 size={16} />
      <div><b>Resultat</b><p>{children}</p></div>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="tut-tip">
      <AlertCircle size={16} />
      <div>{children}</div>
    </div>
  )
}

function StepCard({ n, title, text, result }: { n: number; title: string; text: string; result?: string }) {
  return (
    <div className="tut-step-card">
      <span className="tut-step-num">{n}</span>
      <div>
        <b>{title}</b>
        <p>{text}</p>
        {result ? <p className="tut-inline-result"><strong>Ce qui se passe :</strong> {result}</p> : null}
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
          <h1>Tutoriel Conik.io (detaille)</h1>
          <p className="muted">Guide pas a pas : que faire, dans quel ordre, et ce qui se passe apres chaque action.</p>
        </div>
        <Link className="outline" href="/dashboard">Retour au tableau de bord</Link>
      </header>

      <div className="tut-layout">
        <nav className="tut-nav panel">
          {STEPS.map(({ id, title, icon: Icon }) => (
            <button key={id} type="button" className={active === id ? 'tut-nav-item active' : 'tut-nav-item'} onClick={() => setActive(id)}>
              <Icon size={16} />{title}
            </button>
          ))}
        </nav>

        <div className="tut-content">
          {active === 'overview' && (
            <section className="panel tut-section">
              <h2>A quoi sert Conik.io ?</h2>
              <p className="muted">Conik est un <b>Marketing OS</b> : attirer des visiteurs, capturer des leads, les organiser, les contacter (WhatsApp, campagnes) et mesurer les resultats.</p>
              <div className="tut-flow">
                <span>1. Compte</span><ArrowRight size={16} />
                <span>2. Espace</span><ArrowRight size={16} />
                <span>3. Tunnel</span><ArrowRight size={16} />
                <span>4. Tags</span><ArrowRight size={16} />
                <span>5. Campagne</span><ArrowRight size={16} />
                <span>6. Analytics</span>
              </div>
              <StepCard n={1} title="Tunnel (funnel)" text="Pages web (offre, inscription, merci) hebergees par Conik." result="Les visiteurs voient vos pages. Un formulaire cree un contact dans le CRM." />
              <StepCard n={2} title="Tags" text="Vous etiquetez chaque lead (lead-chaud, webinar-juin…)." result="Vous ciblez ensuite les bonnes personnes en campagne ou automatisation." />
              <StepCard n={3} title="Campagne / WhatsApp" text="Vous preparez le message ou la sequence." result="Les leads recoivent le bon message selon votre config." />
              <StepCard n={4} title="Mesure" text="Dashboard + Analytique." result="Vous voyez ce qui marche pour ajuster." />
              <Tip>Commencez par un tunnel simple (1 page + formulaire + merci), testez, puis ajoutez tags, campagnes et domaines.</Tip>
              <Link className="primary" href="/funnels/new"><Plus size={16} /> Commencer par un tunnel</Link>
            </section>
          )}

          {active === 'start' && (
            <section className="panel tut-section">
              <h2>Premiers pas apres inscription</h2>
              <StepCard n={1} title="Creer un compte" text="Inscription : e-mail + mot de passe (min. 8 caracteres)." result="Compte Auth cree. Une confirmation e-mail peut etre demandee." />
              <StepCard n={2} title="Se connecter" text="Connexion avec e-mail + code / mot de passe." result="Session ouverte. Sans espace de travail, redirection vers l onboarding." />
              <StepCard n={3} title="Espace de travail ou Passer" text="Nom + slug, ou bouton Passer pour l instant." result="Une organisation est creee. Tunnels, contacts et campagnes y seront rattaches." />
              <StepCard n={4} title="Tableau de bord" text="Contacts, tunnels, visiteurs, CA sur 30 jours." result="Centre de commande. CTA pour creer un projet / tunnel." />
              <Result>Vous etes pret a creer votre premier tunnel et a recevoir des leads.</Result>
            </section>
          )}

          {active === 'funnels' && (
            <section className="panel tut-section">
              <h2>Creer et configurer un tunnel</h2>
              <p className="muted">Un <b>tunnel</b> = pages web hebergees par Conik. Les formulaires envoient les leads dans <b>Contacts</b>.</p>
              <h3>A. Tunnel vide</h3>
              <StepCard n={1} title="Ouvrir Funnels" text="Menu gauche puis Funnels." result="Liste de vos tunnels + boutons de creation." />
              <StepCard n={2} title="Nouveau tunnel" text="Nom (ex. Offre ete) + slug (ex. offre-ete)." result="Funnel cree en base (souvent brouillon). Acces detail / editeur." />
              <StepCard n={3} title="Pages dans l editeur" text="Ajoutez au minimum accueil (formulaire) + page merci." result="Chaque page a un slug. HTML/CSS stocke et previsualisable." />
              <StepCard n={4} title="Formulaire" text="Champs utiles : email, nom, telephone. Envoi vers Conik." result="A la validation, un contact est cree ou mis a jour, lie a ce tunnel." />
              <StepCard n={5} title="Publier" text="Statut publie." result="URL publique du type /votre-slug sur l app Conik." />
              <h3>B. Import ZIP</h3>
              <StepCard n={6} title="Importer" text="ZIP HTML/CSS/images via le mode import." result="Conik valide, nettoie et heberge le contenu." />
              <StepCard n={7} title="Verifier puis publier" text="Controle dans l editeur, puis publication." result="Meme comportement qu un tunnel manuel publie." />
              <Tip>Le slug doit etre unique, minuscules, sans espaces (ex. mon-offre-2026).</Tip>
              <Result>Tunnel publie = pages en ligne + leads dans Contacts apres soumission de formulaire.</Result>
              <div className="button-row">
                <Link className="primary" href="/funnels/new">Creer un tunnel</Link>
                <Link className="outline" href="/funnels">Voir mes tunnels</Link>
              </div>
            </section>
          )}

          {active === 'tags' && (
            <section className="panel tut-section">
              <h2>Contacts et tags</h2>
              <StepCard n={1} title="Liste Contacts" text="Menu puis Contacts." result="Tous les leads de votre espace (formulaires, etc.)." />
              <StepCard n={2} title="Fiche contact" text="Cliquez un contact : coordonnees + section Etiquettes." result="Vous travaillez sur une personne precise." />
              <StepCard n={3} title="Creer un tag" text="Nom (ex. lead-chaud) puis Creer et ajouter." result="Tag cree pour l org et assigne au contact." />
              <StepCard n={4} title="Assigner / retirer" text="Liste deroulante puis Ajouter. x sur le badge pour retirer." result="Le contact est classe ; le retrait casse seulement le lien." />
              <Tip>Noms courts : <code>source-instagram</code>, <code>funnel-offre-ete</code>, <code>client</code>.</Tip>
              <Result>Des contacts tagues permettent de cibler precisement campagnes et automatisations.</Result>
              <Link className="primary" href="/contacts"><Users size={16} /> Ouvrir les contacts</Link>
            </section>
          )}

          {active === 'campaigns' && (
            <section className="panel tut-section">
              <h2>Campagnes</h2>
              <StepCard n={1} title="Liste" text="Menu Campagnes : brouillon, active, pausee, archivee." result="Vue de ce qui est en cours ou en prep." />
              <StepCard n={2} title="Nouvelle campagne" text="Nom obligatoire. Tunnel facultatif." result="Campagne enregistree en draft." />
              <StepCard n={3} title="Lier un tunnel" text="Rattachez le funnel de conversion." result="Lien business campagne et pages." />
              <StepCard n={4} title="Statut" text="Passez active / pausee / archivee selon la phase." result="Organisation du travail ; les canaux dependent des integrations." />
              <Tip>Creez et testez d abord le tunnel, puis la campagne liee.</Tip>
              <div className="button-row">
                <Link className="primary" href="/campaigns/new">Nouvelle campagne</Link>
                <Link className="outline" href="/campaigns">Liste</Link>
              </div>
            </section>
          )}

          {active === 'automations' && (
            <section className="panel tut-section">
              <h2>Automatisations</h2>
              <p className="muted"><b>Declencheur</b> (evenement) + <b>actions</b> (message, attente…).</p>
              <StepCard n={1} title="Creer" text="Automatisations puis Nouvelle. Nom clair." result="Scenario cree, souvent inactif au depart." />
              <StepCard n={2} title="Declencheur" text="Nouveau contact, formulaire, WhatsApp recu, opt-in…" result="L evenement peut demarrer le flux pour ce contact." />
              <StepCard n={3} title="Actions" text="WhatsApp, delai, etc. dans l ordre." result="Execution via le moteur Conik / cron." />
              <StepCard n={4} title="Activer" text="Statut active apres test." result="Les prochains evenements declenchent le flux." />
              <Tip>Sur plan Hobby, le cron est limite (ex. 1x/jour) : les delais tres courts peuvent etre arrondis.</Tip>
              <Link className="primary" href="/automations/new">Creer une automatisation</Link>
            </section>
          )}

          {active === 'whatsapp' && (
            <section className="panel tut-section">
              <h2>WhatsApp Business</h2>
              <StepCard n={1} title="Config admin" text="Variables Vercel Meta (APP_ID, SECRET, CONFIG_ID, webhook…)." result="Sans elles, erreur de configuration sur le bouton." />
              <StepCard n={2} title="Connecter" text="Bouton vert Connecter WhatsApp puis autoriser Meta Business." result="WABA / numero enregistres pour votre organisation." />
              <StepCard n={3} title="Templates et inbox" text="Modeles approuves Meta + conversations." result="Envois et receptions lies aux contacts et automatisations." />
              <Link className="primary" href="/whatsapp">Ouvrir WhatsApp</Link>
            </section>
          )}

          {active === 'links' && (
            <section className="panel tut-section">
              <h2>Liens courts</h2>
              <StepCard n={1} title="Creer" text="Slug (ex. promo) + URL de destination." result="Lien public tracke." />
              <StepCard n={2} title="Partager" text="Pubs, stories, WhatsApp, e-mails." result="Clics enregistres pour le suivi." />
              <Link className="primary" href="/links">Gerer les liens</Link>
            </section>
          )}

          {active === 'analytics' && (
            <section className="panel tut-section">
              <h2>Analytique</h2>
              <StepCard n={1} title="Ouvrir" text="Menu Analytique ou depuis le dashboard." result="Indicateurs sur la periode (souvent 30 jours)." />
              <StepCard n={2} title="Interpreter" text="Visiteurs, formulaires, conversions." result="Vous voyez ce qui performe." />
              <Tip>Sans trafic sur un tunnel publie, les compteurs restent a zero : testez l URL publique vous-meme.</Tip>
              <Link className="primary" href="/analytics">Ouvrir Analytics</Link>
            </section>
          )}

          {active === 'domains' && (
            <section className="panel tut-section">
              <h2>Domaines personnalises — guide complet</h2>
              <p className="muted">Par defaut : conik-io.vercel.app/mon-slug. Un domaine perso permet www.votremarque.com ou un sous-domaine.</p>
              <StepCard n={1} title="Tunnel pret" text="Creez et publiez le tunnel a associer." result="Il apparaitra dans la liste deroulante Domaines." />
              <StepCard n={2} title="Ouvrir Domaines" text="Menu puis Domaines." result="Formulaire d ajout + liste existante." />
              <StepCard n={3} title="Ajouter le domaine" text="Ex. www.exemple.com ou offre.exemple.com + tunnel + Ajouter." result="Statut souvent pending_dns (en attente DNS)." />
              <StepCard n={4} title="Configurer le DNS" text="Sous-domaine : CNAME vers cname.vercel-dns.com (rappele sous le formulaire)." result="Le nom de domaine pointe vers l hebergement Conik / Vercel." />
              <StepCard n={5} title="Verifier DNS" text="Bouton Verifier DNS sur la ligne du domaine." result="Succes puis verified. Sinon attendez la propagation et reessayez." />
              <StepCard n={6} title="Tester" text="Ouvrez https://votre-domaine.com." result="Le bon tunnel s affiche ; les leads restent dans le meme CRM." />
              <ul className="tut-list">
                <li><b>pending_dns</b> — ajoute, DNS pas encore valide.</li>
                <li><b>verified</b> — DNS OK.</li>
                <li><b>failed</b> — a corriger puis re-verifier.</li>
              </ul>
              <Tip>Un sous-domaine (offre.monsite.com) est souvent plus simple que le domaine apex (monsite.com). La propagation DNS peut prendre de quelques minutes a quelques heures.</Tip>
              <Result>Domaine verifie + tunnel associe = pages sur votre marque, gerees dans Conik.</Result>
              <Link className="primary" href="/domains">Gerer les domaines</Link>
            </section>
          )}

          {active === 'settings' && (
            <section className="panel tut-section">
              <h2>Parametres</h2>
              <StepCard n={1} title="Theme" text="Clair, sombre ou systeme." result="Couleurs immediatement + memorisation." />
              <StepCard n={2} title="Langue" text="FR, EN, AR, ZH." result="Navigation traduite ; AR active le RTL." />
              <StepCard n={3} title="Nom organisation" text="Nom affiche de l espace." result="Mis a jour en base." />
              <Link className="primary" href="/settings">Ouvrir les parametres</Link>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  )
}
