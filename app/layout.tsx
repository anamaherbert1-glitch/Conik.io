import type { Metadata } from 'next'
import './globals.css'
import './brand.css'
import { PreferencesProvider } from '@/components/preferences-provider'

export const metadata: Metadata = {
  title: 'Conik.io — Marketing OS',
  description: 'Plateforme de tunnels et d’automatisation marketing propulsée par l’IA',
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
  @media(max-width:520px){
    .button-row{width:100%;gap:8px;row-gap:10px}
    .head .button-row,.section-head .button-row{align-items:stretch}
    .head .button-row>.primary,.head .button-row>.outline{min-height:42px}
  }
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <style dangerouslySetInnerHTML={{ __html: responsiveSpacing }} />
      </head>
      <body>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  )
}
