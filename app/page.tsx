import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: '#070812', color: '#f8f8ff', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ maxWidth: 1180, margin: '0 auto', padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontSize: 22, fontWeight: 800 }}>Conik.io</Link>
        <nav style={{ display: 'flex', gap: 24, alignItems: 'center', fontSize: 14 }}>
          <a href="#features" style={{ color: '#b9bbcc', textDecoration: 'none' }}>Fonctionnalités</a>
          <a href="#workflow" style={{ color: '#b9bbcc', textDecoration: 'none' }}>Comment ça marche</a>
          <a href="#pricing" style={{ color: '#b9bbcc', textDecoration: 'none' }}>Tarifs</a>
          <Link href="/login" style={{ color: '#fff', textDecoration: 'none' }}>Connexion</Link>
        </nav>
      </header>

      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '92px 28px 110px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '7px 12px', borderRadius: 999, background: '#15172a', border: '1px solid #282b4a', color: '#aeb2ff', fontSize: 13, fontWeight: 700 }}>MARKETING OS</div>
        <h1 style={{ maxWidth: 900, margin: '24px auto 20px', fontSize: 'clamp(44px, 7vw, 78px)', lineHeight: 1.02, letterSpacing: -2 }}>Créez, publiez et automatisez vos tunnels marketing.</h1>
        <p style={{ maxWidth: 700, margin: '0 auto', color: '#a6a9ba', fontSize: 19, lineHeight: 1.6 }}>Conik.io centralise vos tunnels, pages, contacts, automatisations, WhatsApp et analytics dans un seul espace de travail.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 34 }}>
          <Link href="/signup" style={{ background: '#5b5cf0', color: '#fff', padding: '14px 22px', borderRadius: 10, fontWeight: 800, textDecoration: 'none' }}>Commencer avec Conik</Link>
          <Link href="/login" style={{ border: '1px solid #34374f', color: '#fff', padding: '14px 22px', borderRadius: 10, fontWeight: 700, textDecoration: 'none' }}>Se connecter</Link>
        </div>
      </section>

      <section id="features" style={{ borderTop: '1px solid #1c1e2d', borderBottom: '1px solid #1c1e2d', background: '#0b0d18', padding: '82px 28px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <p style={{ color: '#8f93ff', fontWeight: 800, fontSize: 13 }}>TOUT AU MÊME ENDROIT</p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 50px)', margin: '12px 0 34px' }}>Un véritable centre de commande marketing.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
            {[
              ['Tunnels', 'Créez plusieurs tunnels et gérez leurs pages depuis un éditeur unique.'],
              ['Pages HTML / ZIP', 'Importez vos pages HTML ou ZIP directement dans une page de tunnel.'],
              ['CRM', 'Centralisez les contacts capturés par vos formulaires et tunnels.'],
              ['Automatisations', 'Déclenchez des actions lorsque vos contacts réalisent des événements.'],
              ['WhatsApp', 'Préparez et envoyez vos communications WhatsApp depuis votre espace.'],
              ['Analytics', 'Suivez visiteurs, formulaires, conversions et performances.'],
            ].map(([title, text]) => (
              <article key={title} style={{ padding: 24, border: '1px solid #272a3d', borderRadius: 14, background: '#101221' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 19 }}>{title}</h3>
                <p style={{ margin: 0, color: '#9699ab', lineHeight: 1.55 }}>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" style={{ maxWidth: 1180, margin: '0 auto', padding: '88px 28px' }}>
        <p style={{ color: '#8f93ff', fontWeight: 800, fontSize: 13 }}>WORKFLOW</p>
        <h2 style={{ fontSize: 'clamp(32px, 5vw, 50px)', margin: '12px 0 38px' }}>De l'idée au client.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
          {['Créer un espace', 'Créer un tunnel', 'Ajouter les pages', 'Publier', 'Capturer les contacts', 'Automatiser et analyser'].map((step, index) => (
            <div key={step} style={{ padding: 20, borderRadius: 12, background: '#101221', border: '1px solid #272a3d' }}>
              <strong style={{ color: '#8f93ff' }}>0{index + 1}</strong>
              <div style={{ marginTop: 10, fontWeight: 700 }}>{step}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" style={{ background: '#0b0d18', padding: '82px 28px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#8f93ff', fontWeight: 800, fontSize: 13 }}>CONIK.IO</p>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 50px)', margin: '12px 0 16px' }}>Un seul outil pour votre machine marketing.</h2>
          <p style={{ color: '#9699ab', lineHeight: 1.6 }}>Créez votre espace de travail et commencez à construire vos tunnels sans mélanger vos projets avec d'autres applications.</p>
          <Link href="/signup" style={{ display: 'inline-block', marginTop: 26, background: '#5b5cf0', color: '#fff', padding: '14px 22px', borderRadius: 10, fontWeight: 800, textDecoration: 'none' }}>Créer mon espace</Link>
        </div>
      </section>

      <footer style={{ maxWidth: 1180, margin: '0 auto', padding: '35px 28px', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', color: '#777b8d', fontSize: 13 }}>
        <strong style={{ color: '#fff' }}>Conik.io</strong>
        <span>Marketing OS · Tunnels · CRM · Automatisations · WhatsApp · Analytics</span>
      </footer>
    </main>
  )
}
