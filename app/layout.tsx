import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'Conik.io — Marketing OS',description:'Plateforme de tunnels et d’automatisation marketing propulsée par l’IA'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}
