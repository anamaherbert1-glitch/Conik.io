import Link from 'next/link'

const features = [
  { n: '01', title: 'Créez vos pages', text: 'Créez des pages professionnelles pour présenter une offre, un service, un produit ou votre activité.' },
  { n: '02', title: 'Construisez vos tunnels', text: 'Guidez vos visiteurs naturellement vers l’action que vous souhaitez, dans un parcours clair.' },
  { n: '03', title: 'Publiez & convertissez', text: 'Mettez votre expérience en ligne, récupérez vos prospects et mesurez ce qui fonctionne.' },
]

const steps = [
  ['01', 'CRÉER', 'Votre projet', 'Partez de zéro ou importez ce que vous avez déjà.'],
  ['02', 'PERSONNALISER', 'Votre expérience', 'Adaptez votre page et votre parcours à votre objectif.'],
  ['03', 'PUBLIER', 'Votre présence', 'Mettez votre projet en ligne et partagez-le.'],
  ['04', 'CONVERTIR', 'Vos visiteurs', 'Transformez l’attention en prospects et clients.'],
]

export default function HomePage() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <Link href="/" className="landing-logo"><span>C</span> Conik.io</Link>
        <nav className="landing-links">
          <a href="#features">Fonctionnalités</a>
          <a href="#parcours">Comment ça marche</a>
          <a href="#start">Commencer</a>
        </nav>
        <div className="landing-actions">
          <Link href="/login" className="landing-btn landing-ghost">Se connecter</Link>
          <Link href="/signup" className="landing-btn landing-primary">Commencer</Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-badge">La plateforme pour construire votre présence en ligne</div>
        <h1>Créez. Publiez. <span>Convertissez.</span></h1>
        <p>Conik vous permet de créer des pages et des tunnels professionnels, de les publier et de transformer vos visiteurs en prospects et clients.</p>
        <div className="landing-hero-actions">
          <Link href="/signup" className="landing-btn landing-primary">Commencer gratuitement <b>→</b></Link>
          <a href="#features" className="landing-btn landing-ghost">Découvrir Conik</a>
        </div>
        <small>Aucune compétence technique nécessaire pour commencer.</small>

        <div className="landing-product">
          <div className="landing-browserbar"><i/><i/><i/><span>app.conik.io/dashboard</span></div>
          <div className="landing-app">
            <aside>
              <strong><span>C</span> Conik</strong>
              {['Vue d’ensemble','Mes tunnels','Contacts','Automatisations','Analytics','Domaines'].map((item,i)=>
                <div key={item} className={i===0?'active':''}>{item}</div>
              )}
            </aside>
            <div className="landing-dashboard">
              <div className="landing-dash-head">
                <div><small>Bonjour 👋</small><h3>Votre espace Conik</h3></div>
                <Link href="/signup" className="landing-mini-btn">+ Créer</Link>
              </div>
              <div className="landing-stats">
                <div><b>1 284</b><small>Visiteurs</small></div>
                <div><b>186</b><small>Prospects</small></div>
                <div><b>14,5%</b><small>Conversion</small></div>
              </div>
              <div className="landing-editor">
                <div><span>Éditeur de page</span><em>● Publié</em></div>
                <div className="landing-mock-page">
                  <h4>Votre offre, enfin en ligne.</h4>
                  <p>Une page claire qui présente votre activité et pousse vos visiteurs à agir.</p>
                  <span>Commencer maintenant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="features">
        <div className="landing-center"><label>POURQUOI CONIK ?</label><h2>Tout ce qu’il faut pour passer de l’idée à l’action.</h2><p>Pas besoin d’empiler plusieurs outils pour construire une expérience qui donne envie d’agir.</p></div>
        <div className="landing-cards">
          {features.map(f=><article key={f.n}><div>{f.n}</div><h3>{f.title}</h3><p>{f.text}</p></article>)}
        </div>
      </section>

      <section className="landing-section" id="parcours">
        <div className="landing-center"><label>SIMPLE PAR CONCEPTION</label><h2>Votre parcours avec Conik.</h2><p>Quatre étapes. Pas besoin de se demander quoi faire ensuite.</p></div>
        <div className="landing-steps">
          {steps.map(([n,k,title,text])=><article key={n}><b>{n} — {k}</b><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="landing-cta" id="start">
        <label>PRÊT À COMMENCER ?</label>
        <h2>Votre prochaine page peut être en ligne aujourd’hui.</h2>
        <p>Créez votre espace Conik et commencez à construire une présence en ligne qui travaille pour votre activité.</p>
        <Link href="/signup" className="landing-btn landing-primary">Commencer gratuitement <b>→</b></Link>
      </section>
    </main>
  )
}
