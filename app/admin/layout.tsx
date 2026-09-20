import Link from 'next/link'
import './admin.css'
import { requirePlatformAdmin } from '@/lib/auth/require-platform-admin'

const NAV = [
  { href: '/admin', label: 'Vue d’ensemble' },
  { href: '/admin/users', label: 'Utilisateurs' },
  { href: '/admin/organizations', label: 'Organisations' },
  { href: '/admin/subscriptions', label: 'Abonnements' },
  { href: '/admin/pricing', label: 'Tarifs' },
  { href: '/admin/feedback', label: 'Feedback' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requirePlatformAdmin()

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <Link href="/admin" className="brand">
          <b>C</b>
          <span>Admin Conik</span>
        </Link>
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="nav">
            {item.label}
          </Link>
        ))}
        <div className="spacer" />
        <div style={{ fontSize: 11, color: 'var(--muted)', padding: '8px 10px' }}>{email}</div>
        <Link href="/dashboard" className="nav">
          ← Retour Conik
        </Link>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  )
}
