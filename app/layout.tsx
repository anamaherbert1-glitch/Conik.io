import type { Metadata } from 'next'
import './globals.css'
import './brand.css'
import './conik-theme.css'
import './card-isolation.css'
import './mobile-shell.css'
import './landing.css'
import { PreferencesProvider } from '@/components/preferences-provider'

export const metadata: Metadata = {
  title: 'Conik.io — Marketing OS',
  description: 'Plateforme de tunnels et d’automatisation marketing propulsée par l’IA',
  applicationName: 'Conik',
  icons: {
    icon: [{ url: '/icon', type: 'image/png' }],
    apple: [{ url: '/apple-icon', type: 'image/png' }],
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFF8F1' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1220' },
  ],
}

const themeInit = `
(function(){
  try {
    var t = localStorage.getItem('conik.theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dark);
    var l = localStorage.getItem('conik.locale') || 'fr';
    document.documentElement.lang = l;
    if (l === 'ar') document.documentElement.dir = 'rtl';
  } catch (e) {}
})();
`

const responsiveSpacing = `
  .button-row{row-gap:10px;min-width:0}
  .button-row>*{max-width:100%}
  .head,.section-head{min-width:0}
  .head>div,.section-head>div{min-width:0}
  .page{overflow-x:hidden}
  .form-grid{min-width:0}
  .form-grid>*{min-width:0}
  input,textarea,select{max-width:100%}

  .capture-workspace{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:8px 0 48px;box-sizing:border-box;min-width:0;overflow-x:hidden}
  .capture-topbar{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;width:100%;min-width:0;margin-bottom:20px}
  .capture-title{min-width:0;flex:1 1 auto}
  .capture-title-row{display:flex;align-items:center;gap:12px;min-width:0;flex-wrap:wrap}
  .capture-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex:0 0 auto}
  .capture-alert{width:100%;box-sizing:border-box}
  .capture-layout{display:block;width:100%;min-width:0}
  .capture-main{width:100%;max-width:100%;min-width:0;margin:0 auto;display:grid;gap:18px;box-sizing:border-box}
  .capture-card{width:100%;max-width:100%;min-width:0;margin:0;box-sizing:border-box;overflow:hidden}
  .capture-card-heading{display:flex;align-items:flex-start;gap:12px;min-width:0;box-sizing:border-box}
  .capture-card-heading>div:last-child{min-width:0;flex:1 1 auto}
  .capture-settings-grid{width:100%;min-width:0;box-sizing:border-box}
  .capture-field,.capture-toggle-field{min-width:0}
  .capture-import-row{width:100%;min-width:0;box-sizing:border-box;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
  .capture-file-state{min-width:0;flex:1 1 260px}
  .capture-preview-frame-wrap{width:calc(100% - 40px);max-width:none;margin:0 20px 20px!important;box-sizing:border-box;overflow:hidden;border-radius:12px}
  .capture-preview-frame{display:block;width:100%;max-width:100%;min-height:560px;border:0;box-sizing:border-box}

  @media(max-width:760px){
    .capture-workspace{width:calc(100% - 24px);padding-top:4px}
    .capture-topbar{align-items:stretch;flex-direction:column;gap:14px}
    .capture-actions{justify-content:stretch;width:100%}
    .capture-actions>*{flex:1 1 0;justify-content:center}
    .capture-preview-frame-wrap{width:calc(100% - 24px);margin:0 12px 12px!important}
    .capture-preview-frame{min-height:500px}
  }

  @media(max-width:520px){
    .button-row{width:100%;gap:8px;row-gap:10px}
    .head .button-row,.section-head .button-row{align-items:stretch}
    .head .button-row>.primary,.head .button-row>.outline{min-height:42px}
    .capture-workspace{width:calc(100% - 20px)}
    .capture-card-heading{padding-left:16px!important;padding-right:16px!important}
    .capture-import-row{padding-left:16px!important;padding-right:16px!important}
    .capture-preview-frame{min-height:460px}
  }
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <style dangerouslySetInnerHTML={{ __html: responsiveSpacing }} />
      </head>
      <body>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  )
}
