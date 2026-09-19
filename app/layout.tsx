import type { Metadata } from 'next'
import './globals.css'
import './brand.css'
import './conik-theme.css'
import './card-isolation.css'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  )
}
