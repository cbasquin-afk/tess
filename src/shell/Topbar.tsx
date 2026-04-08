import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { MODULES } from './modules.config'

function buildBreadcrumb(pathname: string): string[] {
  if (pathname === '/') return ['Accueil']
  const segs = pathname.split('/').filter(Boolean)
  const root = MODULES.find((m) => m.path === `/${segs[0]}`)
  const head = root?.label ?? segs[0]
  return [head, ...segs.slice(1)]
}

function formatToday(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function Topbar() {
  const location = useLocation()
  const crumbs = buildBreadcrumb(location.pathname)
  // Calculé une seule fois au mount du shell. Si l'app reste ouverte
  // plus de 24h, la date sera obsolète d'un jour — accepté pour XS.
  const today = useMemo(() => formatToday(new Date()), [])

  return (
    <header
      style={{
        height: 56,
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ flex: 1, fontSize: 14, color: '#475569' }}>
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span style={{ margin: '0 8px', color: '#cbd5e1' }}>/</span>}
            <span style={{ color: i === crumbs.length - 1 ? '#0f172a' : '#64748b' }}>
              {c}
            </span>
          </span>
        ))}
      </div>

      <div
        style={{
          fontSize: 11,
          color: '#94a3b8',
          fontWeight: 500,
          textTransform: 'capitalize',
        }}
      >
        {today}
      </div>

      <button
        type="button"
        style={{
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          padding: '6px 12px',
          borderRadius: 6,
          fontSize: 13,
          color: '#64748b',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        🔍 Rechercher
        <kbd
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 4,
            padding: '0 6px',
            fontSize: 11,
            color: '#94a3b8',
          }}
        >
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        aria-label="Notifications"
        style={{
          background: 'transparent',
          border: 'none',
          fontSize: 18,
          cursor: 'pointer',
          padding: 6,
        }}
      >
        🔔
      </button>
    </header>
  )
}
