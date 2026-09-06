import { ArrowRight, Check, Download, MessageCircle, ShieldCheck, WifiOff } from 'lucide-react'

const features = [
  ['Student management', 'Digital student records, registrations and academic history.'],
  ['Academic management', 'Classes, subjects, grades, examinations and reports.'],
  ['Finance', 'Fees, payments, installments, receipts and reports.'],
  ['Documents', 'Report cards, transcripts, certificates and receipts.'],
  ['Security', 'Roles, permissions, authentication, audit logs and backups.'],
  ['LAN multi-computer', 'Use CONIK across several computers on the school network.'],
] as const

const steps = [
  ['01', 'Install CONIK', 'Install the desktop application on the school computer.'],
  ['02', 'Configure your school', 'Set school information, academic year, programs, classes and users.'],
  ['03', 'Manage your school', 'Manage students, teachers, grades, payments, examinations and documents.'],
  ['04', 'Stay protected', 'Use backups, secure local storage, licensing and updates.'],
] as const

const downloads = [
  ['Windows', 'Windows 10/11 · 64-bit', 'https://github.com/anamaherbert1-glitch/conic-school/releases/latest/download/CONIK-Setup.exe'],
  ['MacBook', 'macOS · Apple Silicon & Intel', '#'],
  ['iPhone', 'iOS · App Store', '#'],
] as const

const plans = [
  ['Basic', ['Student management', 'Academic management', 'Local database', 'Documents']],
  ['Professional', ['Everything in Basic', 'Finance', 'Advanced reports', 'LAN support', 'Priority support']],
  ['Enterprise', ['Advanced deployment', 'Multiple installations', 'Custom configuration', 'Dedicated support']],
] as const

export default function OfficialPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#FAFAF9', color: '#14161C', fontFamily: 'Arial, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 20, borderBottom: '1px solid #E4E3DD', background: 'rgba(250,250,249,.94)', backdropFilter: 'blur(10px)' }}>
        <div style={{ maxWidth: 1180, margin: 'auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <a href="#top" style={{ fontWeight: 800, fontSize: 20, textDecoration: 'none', color: 'inherit' }}>CONIK <small style={{ fontSize: 9, color: '#8A8D97' }}>SCHOOL MANAGEMENT</small></a>
          <nav style={{ display: 'flex', gap: 20, fontSize: 13 }}><a href="#features">Features</a><a href="#how">How it works</a><a href="#download">Download</a><a href="#pricing">Pricing</a><a href="#support">Support</a></nav>
          <a href="#download" style={{ background: '#2A4CE0', color: '#fff', padding: '10px 15px', borderRadius: 7, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Download CONIK</a>
        </div>
      </header>

      <section id="top" style={{ maxWidth: 1180, margin: 'auto', padding: '90px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 55, alignItems: 'center' }}>
        <div>
          <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#1B2E8C' }}>OFFLINE-FIRST · SECURE · LAN READY</p>
          <h1 style={{ fontSize: 'clamp(44px,6vw,68px)', lineHeight: 1, letterSpacing: '-.055em', margin: '14px 0 22px' }}>Run your school with confidence.</h1>
          <p style={{ fontSize: 18, color: '#585C68', lineHeight: 1.6 }}>A professional school management system built for reliable everyday operations — even without permanent Internet access.</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}><a href="#download" style={{ background: '#2A4CE0', color: '#fff', padding: '14px 20px', borderRadius: 7, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>Get CONIK <ArrowRight size={17} /></a><a href="#features" style={{ border: '1px solid #D3D2CA', padding: '14px 20px', borderRadius: 7, fontWeight: 600 }}>Explore features</a></div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #D3D2CA', borderRadius: 16, padding: 22, boxShadow: '0 25px 70px -35px rgba(20,22,28,.35)' }}><div style={{ fontSize: 12, color: '#8A8D97', marginBottom: 18 }}>CONIK DASHBOARD</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{[['1,284', 'Students'], ['64', 'Teachers'], ['42', 'Classes'], ['18.4M', 'Collected FCFA']].map(([n, l]) => <div key={l} style={{ border: '1px solid #E4E3DD', borderRadius: 8, padding: 15 }}><b style={{ fontSize: 21 }}>{n}</b><div style={{ fontSize: 11, color: '#8A8D97' }}>{l}</div></div>)}</div><div style={{ height: 110, marginTop: 16, border: '1px solid #E4E3DD', borderRadius: 8, display: 'flex', alignItems: 'end', gap: 7, padding: 15 }}>{[35,52,44,68,60,80,71,92].map((h, i) => <i key={i} style={{ height: `${h}%`, flex: 1, background: '#2A4CE0', opacity: .3 + i * .07, borderRadius: '4px 4px 0 0' }} />)}</div></div>
      </section>

      <section id="features" style={{ padding: '90px 24px', background: '#fff' }}><div style={{ maxWidth: 1180, margin: 'auto' }}><p style={{ fontFamily: 'monospace', fontSize: 12, color: '#1B2E8C' }}>FEATURES</p><h2 style={{ fontSize: 40, letterSpacing: '-.04em' }}>Everything your school needs.</h2><p style={{ color: '#585C68', fontSize: 17 }}>Students, academics, finance, documents, security and multi-computer operations in one system.</p><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginTop: 40 }}>{features.map(([title, text]) => <article key={title} style={{ border: '1px solid #E4E3DD', borderRadius: 12, padding: 24 }}><h3 style={{ fontSize: 17 }}>{title}</h3><p style={{ fontSize: 14, color: '#585C68' }}>{text}</p></article>)}</div></div></section>

      <section id="how" style={{ padding: '90px 24px' }}><div style={{ maxWidth: 1180, margin: 'auto' }}><p style={{ fontFamily: 'monospace', fontSize: 12, color: '#1B2E8C' }}>HOW IT WORKS</p><h2 style={{ fontSize: 40, letterSpacing: '-.04em' }}>From installation to daily operations.</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 22, marginTop: 40 }}>{steps.map(([num, title, text]) => <div key={num} style={{ borderLeft: '1px solid #D3D2CA', paddingLeft: 20 }}><b style={{ fontFamily: 'monospace', color: '#2A4CE0' }}>{num}</b><h3>{title}</h3><p style={{ fontSize: 14, color: '#585C68' }}>{text}</p></div>)}</div></div></section>

      <section style={{ padding: '90px 24px', background: '#0D0F16', color: '#E7E8ED' }}><div style={{ maxWidth: 1180, margin: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 55, alignItems: 'center' }}><div><div style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'monospace', fontSize: 12, color: '#B7C3FF' }}><WifiOff size={15} /> OFFLINE-FIRST</div><h2 style={{ fontSize: 42, letterSpacing: '-.04em', color: '#E7E8ED' }}>Your school should not stop when the Internet does.</h2><p style={{ color: '#9498A6' }}>Everyday operational data can stay on your computers. Internet access is mainly needed for licensing, activation, renewal and updates.</p></div><div style={{ border: '1px solid #2A2E3D', borderRadius: 14, padding: 25 }}>{['CONIK CLOUD · License · Billing · Updates', 'CONIK WINDOWS APP', 'SQLite · Files · PDFs', 'SCHOOL DATA'].map(x => <div key={x} style={{ border: '1px solid #2A2E3D', borderRadius: 6, padding: 13, marginTop: 8, textAlign: 'center' }}>{x}</div>)}</div></div></section>

      <section id="download" style={{ padding: '90px 24px', background: '#F5F5F2' }}><div style={{ maxWidth: 1180, margin: 'auto' }}><p style={{ fontFamily: 'monospace', fontSize: 12, color: '#1B2E8C' }}>DOWNLOAD</p><h2 style={{ fontSize: 40, letterSpacing: '-.04em' }}>Get CONIK for your device.</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginTop: 40 }}>{downloads.map(([title, desc, href]) => <div key={title} style={{ background: '#fff', border: '1px solid #D3D2CA', borderRadius: 14, padding: 26 }}><h3>{title}</h3><p style={{ color: '#585C68', fontSize: 14 }}>{desc}</p><a href={href} onClick={e => { if (href === '#') e.preventDefault() }} style={{ display: 'inline-flex', gap: 8, alignItems: 'center', marginTop: 16, background: '#2A4CE0', color: '#fff', padding: '12px 16px', borderRadius: 7, fontWeight: 700, fontSize: 13 }}><Download size={16} /> Download</a></div>)}</div><p style={{ marginTop: 15, fontSize: 12, color: '#8A8D97' }}>Les versions Mac et iPhone seront activées dès leur publication officielle.</p></div></section>

      <section id="pricing" style={{ padding: '90px 24px', background: '#fff' }}><div style={{ maxWidth: 1180, margin: 'auto' }}><p style={{ fontFamily: 'monospace', fontSize: 12, color: '#1B2E8C' }}>PRICING</p><h2 style={{ fontSize: 40, letterSpacing: '-.04em' }}>Choose the right CONIK plan.</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginTop: 40 }}>{plans.map(([title, items]) => <div key={title} style={{ border: title === 'Professional' ? '2px solid #2A4CE0' : '1px solid #E4E3DD', borderRadius: 14, padding: 26, background: title === 'Professional' ? '#EEF1FD' : '#fff' }}><small style={{ fontFamily: 'monospace', color: '#1B2E8C' }}>{title === 'Professional' ? 'MOST POPULAR' : title.toUpperCase()}</small><h3>{title}</h3><p style={{ fontWeight: 700 }}>Contact us</p><ul style={{ padding: 0, listStyle: 'none' }}>{items.map(item => <li key={item} style={{ padding: '8px 0', borderTop: '1px solid #E4E3DD', fontSize: 14 }}><Check size={15} style={{ verticalAlign: 'middle', marginRight: 7 }} />{item}</li>)}</ul></div>)}</div></div></section>

      <section id="support" style={{ padding: '90px 24px', background: '#F5F5F2' }}><div style={{ maxWidth: 850, margin: 'auto', textAlign: 'center', background: '#fff', border: '1px solid #D3D2CA', borderRadius: 16, padding: '55px 25px' }}><ShieldCheck size={34} style={{ color: '#2A4CE0' }} /><h2 style={{ fontSize: 38 }}>Need help with CONIK?</h2><p style={{ color: '#585C68' }}>Support for installation, configuration, licensing and everyday use.</p><div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' }}><a href="mailto:contact@conik.io?subject=Support%20CONIK" style={{ border: '1px solid #D3D2CA', padding: '12px 18px', borderRadius: 7, fontWeight: 700 }}>Email support</a><a href="#" onClick={e => { e.preventDefault(); alert('Le numéro WhatsApp officiel sera ajouté ici.') }} style={{ background: '#2A4CE0', color: '#fff', padding: '12px 18px', borderRadius: 7, fontWeight: 700, display: 'inline-flex', gap: 8, alignItems: 'center' }}><MessageCircle size={17} /> WhatsApp support</a></div></div></section>

      <footer style={{ borderTop: '1px solid #E4E3DD', padding: '30px 24px', fontSize: 12, color: '#8A8D97' }}><div style={{ maxWidth: 1180, margin: 'auto', display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}><span>© 2026 CONIK School Management.</span><span>Lomé, Togo · contact@conik.io</span></div></footer>
    </main>
  )
}
