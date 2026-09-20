import Link from 'next/link'

const features = [
  {
    title: 'Tunnels multi-pages',
    desc: 'Créez ou importez un mini-site HTML complet : pages, CSS, JS, images, vidéos.',
  },
  {
    title: 'Paiements locaux',
    desc: 'CinetPay, FedaPay, Wave, Flutterwave, PayDunya et d’autres agrégateurs africains.',
  },
  {
    title: 'WhatsApp intégré',
    desc: 'Connectez WhatsApp pour relancer, accompagner et convertir vos contacts.',
  },
  {
    title: 'Live & campagnes',
    desc: 'Animez des lives, lancez des campagnes et automatisez vos scénarios.',
  },
  {
    title: 'Analytics & revenus',
    desc: 'Suivez le trafic, les conversions et l’argent généré par vos tunnels.',
  },
  {
    title: 'Pensé mobile',
    desc: 'Une interface claire sur téléphone comme sur ordinateur.',
  },
]

const steps = [
  { n: '1', t: 'Créer', d: 'Importez un projet HTML ou construisez votre tunnel.' },
  { n: '2', t: 'Connecter', d: 'Paiement, WhatsApp, domaine — en quelques clics.' },
  { n: '3', t: 'Publier', d: 'Partagez le lien public et commencez à vendre.' },
  { n: '4', t: 'Mesurer', d: 'Analytics et revenus dans un même tableau de bord.' },
]

export default function HomePage() {
  return (
    <main className="land">
      <header className="land-nav">
        <Link href="/" className="land-brand">
          <span className="land-logo">C</span>
          <span>
            <strong>Conik.io</strong>
            <small>Marketing OS</small>
          </span>
        </Link>
        <nav className="land-nav-links">
          <a href="#features">Fonctionnalités</a>
          <a href="#how">Fonctionnement</a>
          <Link href="/login" className="land-btn ghost">
            Connexion
          </Link>
          <Link href="/signup" className="land-btn solid">
            S’inscrire
          </Link>
        </nav>
      </header>

      <section className="land-hero">
        <div className="land-hero-copy">
          <p className="land-kicker">Marketing OS pour l’Afrique</p>
          <h1>
            Créez, publiez et monétisez
            <br />
            vos tunnels de vente.
          </h1>
          <p className="land-lead">
            Conik.io regroupe funnels, contacts, WhatsApp, paiements locaux et analytics dans une seule plateforme —
            pensée pour les créateurs, coachs et PME.
          </p>
          <div className="land-cta">
            <Link href="/signup" className="land-btn solid lg">
              Créer un compte gratuit
            </Link>
            <Link href="/login" className="land-btn ghost lg">
              Se connecter
            </Link>
          </div>
          <p className="land-note">Inscription par e-mail ou Google · Accès immédiat</p>
        </div>
        <div className="land-hero-card" aria-hidden="true">
          <div className="land-mock-bar">
            <span />
            <span />
            <span />
          </div>
          <div className="land-mock-body">
            <div className="land-mock-stat">
              <small>Vues</small>
              <b>2 480</b>
            </div>
            <div className="land-mock-stat">
              <small>Conversions</small>
              <b>186</b>
            </div>
            <div className="land-mock-stat">
              <small>Revenus</small>
              <b>1,2M XOF</b>
            </div>
            <div className="land-mock-line" />
            <p>Tableau de bord · Funnels · WhatsApp · Paiements</p>
          </div>
        </div>
      </section>

      <section id="features" className="land-section">
        <h2>Tout ce qu’il faut pour vendre en ligne</h2>
        <p className="land-section-lead">Une suite cohérente à la place de 5 outils séparés.</p>
        <div className="land-grid">
          {features.map((f) => (
            <article key={f.title} className="land-feature">
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="land-section land-section-alt">
        <h2>Comment ça marche</h2>
        <div className="land-steps">
          {steps.map((s) => (
            <div key={s.n} className="land-step">
              <span className="land-step-n">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="land-section land-final">
        <h2>Prêt à lancer votre prochain tunnel ?</h2>
        <p className="land-section-lead">Créez votre compte en moins d’une minute.</p>
        <div className="land-cta center">
          <Link href="/signup" className="land-btn solid lg">
            S’inscrire
          </Link>
          <Link href="/login" className="land-btn ghost lg">
            J’ai déjà un compte
          </Link>
        </div>
      </section>

      <footer className="land-footer">
        <span>© {new Date().getFullYear()} Conik.io</span>
        <div>
          <Link href="/login">Connexion</Link>
          <Link href="/signup">Inscription</Link>
        </div>
      </footer>
    </main>
  )
}
