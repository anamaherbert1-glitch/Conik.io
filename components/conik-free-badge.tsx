export function ConikFreeBadge() {
  return (
    <a
      href="https://conik-io.vercel.app"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: 'fixed',
        bottom: 14,
        right: 14,
        zIndex: 2147483646,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px 8px 8px',
        background: 'rgba(15,23,42,0.92)',
        color: '#fff',
        borderRadius: 999,
        textDecoration: 'none',
        font: '600 12px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        boxShadow: '0 10px 30px rgba(0,0,0,0.28)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          background: '#5b5cf0',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          fontSize: 12,
          color: '#fff',
        }}
      >
        C
      </span>
      <span>
        Made with <b style={{ fontWeight: 800 }}>Conik.io</b>
      </span>
      <span aria-hidden="true" style={{ opacity: 0.85, fontSize: 14 }}>
        →
      </span>
    </a>
  )
}
