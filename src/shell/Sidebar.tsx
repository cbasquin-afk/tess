import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MODULES } from './modules.config'
import { useAuth } from '../shared/auth/useAuth'
import { hasRole, type ModuleConfig } from '../shared/types'
import { Badge } from '../shared/ui'

interface PerfLeadGroup {
  label: string
  links: readonly { path: string; label: string }[]
}

const PERFLEAD_GROUPS: readonly PerfLeadGroup[] = [
  {
    label: 'DASHBOARD',
    links: [
      { path: '/perflead', label: 'Vue générale' },
      { path: '/perflead/hebdo', label: 'Hebdomadaire' },
    ],
  },
  {
    label: 'ANALYSE',
    links: [
      { path: '/perflead/contrats', label: 'Contrats & PM' },
      { path: '/perflead/gammes', label: 'Gammes & Niveaux' },
      { path: '/perflead/ages', label: "Tranches d'âge" },
      { path: '/perflead/commerciaux', label: 'Commerciaux' },
      { path: '/perflead/entonnoir', label: 'Entonnoir' },
      { path: '/perflead/analyse', label: 'Analyse périodes' },
    ],
  },
  {
    label: 'PIPELINE',
    links: [
      { path: '/perflead/pipeline', label: 'Pipeline actif' },
      { path: '/perflead/statuts', label: 'Statuts détaillés' },
      { path: '/perflead/alertes', label: '🔔 Alertes' },
    ],
  },
  {
    label: 'OUTILS',
    links: [
      { path: '/perflead/personae', label: 'Personae' },
      { path: '/perflead/fournisseur', label: 'Fournisseur' },
      { path: '/perflead/import', label: 'Import CRM' },
    ],
  },
] as const

// Pour l'instant, seul PerfLead a une sous-navigation structurée.
// Si d'autres modules en gagnent une plus tard, on pourra mapper par path.
function hasSublinks(m: ModuleConfig): boolean {
  return m.path === '/perflead'
}

function isActive(m: ModuleConfig, pathname: string): boolean {
  if (m.path === '/') return pathname === '/'
  return pathname === m.path || pathname.startsWith(m.path + '/')
}

export function Sidebar() {
  const { user, role, signOut } = useAuth()
  const location = useLocation()
  const [openModule, setOpenModule] = useState<string | null>(null)

  // visible mémoïsé pour éviter de re-déclencher useEffect à chaque render
  const visible = useMemo(
    () => MODULES.filter((m) => !m.hidden && hasRole(role, m.minRole)),
    [role],
  )

  // Auto-expand : à chaque navigation, ouvrir le module dont la route matche.
  useEffect(() => {
    const active = visible.find((m) => isActive(m, location.pathname))
    if (active) setOpenModule(active.path)
  }, [location.pathname, visible])

  function handleToggle(path: string) {
    setOpenModule((prev) => (prev === path ? null : path))
  }

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
          const active = isActive(m, location.pathname)
          const sublinks = hasSublinks(m)
          const isOpen = openModule === m.path

          // ── Module SOON : non cliquable ────────────────────
          if (m.soon) {
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 6,
                  color: '#64748b',
                  fontSize: 14,
                  cursor: 'not-allowed',
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 16 }}>{m.icon}</span>
                <span style={{ flex: 1 }}>{m.label}</span>
                <Badge tone="warning">soon</Badge>
              </div>
            )
          }

          // ── Module avec sous-rubriques (PerfLead) ──────────
          if (sublinks) {
            return (
              <div key={m.id} style={{ marginBottom: 2 }}>
                <div
                  onClick={() => handleToggle(m.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    color: active ? '#fff' : '#cbd5e1',
                    background: active ? '#1e293b' : 'transparent',
                    fontSize: 14,
                    fontWeight: active ? 600 : 400,
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{m.icon}</span>
                  <span style={{ flex: 1 }}>{m.label}</span>
                  <span
                    style={{
                      fontSize: 9,
                      color: '#64748b',
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s',
                      display: 'inline-block',
                    }}
                  >
                    ▶
                  </span>
                </div>

                {isOpen && m.path === '/perflead' && (
                  <div style={{ marginTop: 4, marginBottom: 6 }}>
                    {PERFLEAD_GROUPS.map((group) => (
                      <div key={group.label}>
                        <div
                          style={{
                            fontSize: 9,
                            color: '#666',
                            textTransform: 'uppercase',
                            letterSpacing: '.08em',
                            padding: '10px 0 3px 12px',
                            fontWeight: 600,
                          }}
                        >
                          {group.label}
                        </div>
                        {group.links.map((sl) => {
                          const slActive = location.pathname === sl.path
                          return (
                            <Link
                              key={sl.path}
                              to={sl.path}
                              style={{
                                display: 'block',
                                padding: '7px 12px 7px 20px',
                                borderRadius: 5,
                                color: slActive ? '#fff' : '#94a3b8',
                                background: slActive
                                  ? '#1e293b'
                                  : 'transparent',
                                textDecoration: 'none',
                                fontSize: 12,
                                fontWeight: slActive ? 600 : 400,
                                marginBottom: 1,
                              }}
                            >
                              {sl.label}
                            </Link>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          // ── Module sans sous-rubriques : navigation directe ─
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
            </Link>
          )
        })}
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
