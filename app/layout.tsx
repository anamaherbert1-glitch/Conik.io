import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Conik.io — Marketing OS',description:'AI-first funnel and marketing automation platform'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}
