import { Link, useLocation } from 'react-router-dom'
import { MODULES } from './modules.config'
import { useAuth } from '../shared/auth/useAuth'
import { hasRole } from '../shared/types'
import { Badge } from '../shared/ui'

const PERFLEAD_SUBLINKS = [
  { path: '/perflead', label: 'Vue générale' },
  { path: '/perflead/hebdo', label: 'Suivi hebdo' },
  { path: '/perflead/analyse', label: 'Analyse périodes' },
  { path: '/perflead/commerciaux', label: 'Commerciaux' },
  { path: '/perflead/contrats', label: 'Contrats & PM' },
  { path: '/perflead/gammes', label: 'Gammes' },
  { path: '/perflead/ages', label: "Tranches d'âge" },
  { path: '/perflead/pipeline', label: 'Pipeline & statuts' },
  { path: '/perflead/alertes', label: '🔔 Alertes' },
  { path: '/perflead/personae', label: 'Personae' },
  { path: '/perflead/import', label: 'Import CRM' },
] as const

export function Sidebar() {
  const { user, role, signOut } = useAuth()
  const location = useLocation()

  const visible = MODULES.filter((m) => hasRole(role, m.minRole))

  return (
    <aside
      style={{
        width: 240,
        background: '#0f172a',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      <div
        style={{
          padding: '20px 18px',
          borderBottom: '1px solid #1e293b',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 0.5,
        }}
      >
        Tess<span style={{ color: '#60a5fa' }}>.</span>
        <div style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}>
          Plateforme Tessoria
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {visible.map((m) => {
          const active =
            m.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(m.path)
          return (
            <Link
              key={m.id}
              to={m.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 6,
                color: active ? '#fff' : '#cbd5e1',
                background: active ? '#1e293b' : 'transparent',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 16 }}>{m.icon}</span>
              <span style={{ flex: 1 }}>{m.label}</span>
              {m.soon && <Badge tone="warning">soon</Badge>}
            </Link>
          )
        })}

        {/* Sous-navigation PerfLead — visible quand on est dans /perflead */}
        {location.pathname.startsWith('/perflead') && (
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            {PERFLEAD_SUBLINKS.map((sl) => {
              const active = location.pathname === sl.path
              return (
                <Link
                  key={sl.path}
                  to={sl.path}
                  style={{
                    display: 'block',
                    padding: '6px 12px 6px 38px',
                    borderRadius: 5,
                    color: active ? '#fff' : '#94a3b8',
                    background: active ? '#1e293b' : 'transparent',
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    marginBottom: 1,
                  }}
                >
                  {sl.label}
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      <div
        style={{
          padding: 14,
          borderTop: '1px solid #1e293b',
          fontSize: 13,
        }}
      >
        {user ? (
          <>
            <div style={{ fontWeight: 600, color: '#f1f5f9' }}>
              {user.prenom || user.nom
                ? `${user.prenom ?? ''} ${user.nom ?? ''}`.trim()
                : user.email}
            </div>
            <div style={{ color: '#94a3b8', marginBottom: 8, fontSize: 11 }}>
              {user.email}
            </div>
            <div style={{ marginBottom: 10 }}>
              <Badge tone="info">{user.role}</Badge>
            </div>
            <button
              onClick={() => {
                void signOut()
              }}
              style={{
                width: '100%',
                background: 'transparent',
                color: '#f87171',
                border: '1px solid #334155',
                padding: '6px 10px',
                borderRadius: 5,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Se déconnecter
            </button>
          </>
        ) : (
          <div style={{ color: '#94a3b8' }}>Non connecté</div>
        )}
      </div>
    </aside>
  )
}
