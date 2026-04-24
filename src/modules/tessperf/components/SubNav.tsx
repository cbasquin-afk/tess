import { Link, useLocation } from 'react-router-dom'

interface Entry {
  path: string
  label: string
  icon: string
}

const ENTRIES: readonly Entry[] = [
  { path: '/tessperf/mensuel', label: 'Mensuel', icon: '📅' },
  { path: '/tessperf/hebdomadaire', label: 'Hebdomadaire', icon: '📊' },
  { path: '/tessperf/barometre', label: 'Baromètre', icon: '🌡️' },
]

export function SubNav() {
  const location = useLocation()
  return (
    <nav
      style={{
        width: 180,
        flexShrink: 0,
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignSelf: 'flex-start',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          padding: '6px 10px 2px',
        }}
      >
        Vue
      </div>
      {ENTRIES.map((e) => {
        const active = location.pathname.startsWith(e.path)
        return (
          <Link
            key={e.path}
            to={e.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? '#fff' : '#475569',
              background: active ? '#1f3a8a' : 'transparent',
              textDecoration: 'none',
            }}
          >
            <span>{e.icon}</span>
            <span>{e.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
