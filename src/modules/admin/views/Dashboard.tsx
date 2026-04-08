import { useMemo } from 'react'
import { useKpis } from '../hooks/useKpis'
import { useInstances } from '../hooks/useInstances'
import { useContrats } from '../hooks/useContrats'
import type { TadminContrat, TadminInstance } from '../types'

const ACCENT_GREEN = '#00C18B'
const COMMERCIAUX = ['Charlotte', 'Cheyenne', 'Mariam', 'Christopher'] as const

function fmtEur(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return (
    Number(n).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' €'
  )
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return (
      String(d.getDate()).padStart(2, '0') +
      '/' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '/' +
      d.getFullYear()
    )
  } catch {
    return iso
  }
}

const SOURCE_COLORS: Record<string, string> = {
  ASAF: '#00C18B',
  FMA: '#378ADD',
  SMATIS: '#BA7517',
  VERALTI: '#534AB7',
}

function SourceBadge({ source }: { source: string }) {
  const col = SOURCE_COLORS[source] ?? '#888780'
  return (
    <span
      style={{
        background: `${col}18`,
        color: col,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {source}
    </span>
  )
}

function deadlineColor(jours: number | null): string {
  if (jours === null) return '#94a3b8'
  if (jours < 0) return '#E24B4A'
  if (jours <= 2) return '#E24B4A'
  if (jours <= 5) return '#BA7517'
  return '#1D9E75'
}

function Dashboard() {
  const { kpis, loading: lk, error: ek } = useKpis()
  const { instances, loading: li, error: ei } = useInstances()
  const { contrats, loading: lc, error: ec } = useContrats()

  // Top instances urgentes : jours_restants ≤ 3, max 4 — fidèle au natif
  const urgentInstances = useMemo<TadminInstance[]>(() => {
    return instances
      .filter((i) => i.jours_restants !== null && i.jours_restants <= 3)
      .slice(0, 4)
  }, [instances])

  // Top contrats en attente : statut_compagnie === 'En attente', max 5
  const enAttenteContrats = useMemo<TadminContrat[]>(() => {
    return contrats
      .filter((c) => c.statut_compagnie === 'En attente')
      .slice(0, 5)
  }, [contrats])

  // Activité du mois en cours par commercial
  const activite30j = useMemo(() => {
    const now = new Date()
    const firstOfMonth =
      now.getFullYear() +
      '-' +
      String(now.getMonth() + 1).padStart(2, '0') +
      '-01'
    const recent = contrats.filter(
      (r) => r.date_signature !== null && r.date_signature >= firstOfMonth,
    )
    const byComm = new Map<string, { nb: number; com: number }>()
    for (const r of recent) {
      const c = r.commercial_prenom ?? 'Autre'
      const cur = byComm.get(c) ?? { nb: 0, com: 0 }
      cur.nb += 1
      cur.com += r.commission_generee ?? 0
      byComm.set(c, cur)
    }
    return COMMERCIAUX.map((c) => ({
      prenom: c,
      stats: byComm.get(c) ?? null,
    })).filter((entry) => entry.stats !== null)
  }, [contrats])

  const loading = lk || li || lc
  const error = ek ?? ei ?? ec

  if (loading)
    return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Dashboard</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Vue d'ensemble de l'activité administrative.
        </p>
      </div>

      {/* 4 KPIs principaux — fidèle au natif loadKPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        <Kpi
          label="Contrats 30j"
          value={kpis ? String(kpis.contrats_30j ?? 0) : '—'}
          hint={
            kpis
              ? `dont ${kpis.contrats_en_attente ?? 0} en attente`
              : undefined
          }
        />
        <Kpi
          label="Com. 30 jours"
          value={fmtEur(kpis?.com_30j ?? null)}
          hint={
            kpis
              ? `Année : ${fmtEur(kpis.com_annee_courante)}`
              : undefined
          }
          color={ACCENT_GREEN}
        />
        <Kpi
          label="Panier moyen"
          value={fmtEur(kpis?.panier_moyen_30j ?? null)}
          hint="30 derniers jours"
          color={
            (kpis?.panier_moyen_30j ?? 0) >= 100
              ? ACCENT_GREEN
              : '#E24B4A'
          }
        />
        <Kpi
          label="Instances"
          value={kpis ? String(kpis.instances_ouvertes ?? 0) : '—'}
          hint={
            kpis ? `${kpis.instances_urgentes ?? 0} urgente(s)` : undefined
          }
          color={
            (kpis?.instances_ouvertes ?? 0) > 0 ? '#E24B4A' : ACCENT_GREEN
          }
        />
      </div>

      {/* Deux tables en grille */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 16,
        }}
      >
        <Card title="Instances urgentes">
          {urgentInstances.length === 0 ? (
            <Empty label="Aucune instance urgente ✓" />
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={trHeadStyle}>
                  <th style={th}>Client</th>
                  <th style={th}>Source</th>
                  <th style={th}>Deadline</th>
                  <th style={th}>Motif</th>
                </tr>
              </thead>
              <tbody>
                {urgentInstances.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ ...td, fontWeight: 500, color: '#0f172a' }}>
                      {r.client_nom}
                    </td>
                    <td style={td}>
                      <SourceBadge source={r.source} />
                    </td>
                    <td
                      style={{
                        ...td,
                        color: deadlineColor(r.jours_restants),
                        fontWeight: 600,
                      }}
                    >
                      {fmtDate(r.deadline)}
                      {r.jours_restants !== null &&
                        r.jours_restants < 0 &&
                        ' ⚠'}
                    </td>
                    <td
                      style={{
                        ...td,
                        color: '#94a3b8',
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.motif ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Contrats en attente">
          {enAttenteContrats.length === 0 ? (
            <Empty label="Aucun contrat en attente ✓" />
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={trHeadStyle}>
                  <th style={th}>Client</th>
                  <th style={th}>Compagnie</th>
                  <th style={th}>Commercial</th>
                  <th style={{ ...th, textAlign: 'right' }}>Cotisation</th>
                </tr>
              </thead>
              <tbody>
                {enAttenteContrats.map((c) => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ ...td, fontWeight: 500, color: '#0f172a' }}>
                      {c.client}
                    </td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {c.compagnie_assureur ?? '—'}
                    </td>
                    <td style={{ ...td, color: '#475569' }}>
                      {c.commercial_prenom ?? '—'}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        fontFamily: 'ui-monospace, monospace',
                        color: '#0f172a',
                      }}
                    >
                      {fmtEur(c.cotisation_mensuelle)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Activité du mois en cours par commercial */}
      <div>
        <h2 style={{ margin: '0 0 12px', fontSize: 16 }}>
          Activité — mois en cours
        </h2>
        {activite30j.length === 0 ? (
          <Card title="">
            <Empty label="Aucun contrat ce mois-ci" />
          </Card>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${activite30j.length}, 1fr)`,
              gap: 14,
            }}
          >
            {activite30j.map((entry) => (
              <Kpi
                key={entry.prenom}
                label={entry.prenom}
                value={String(entry.stats?.nb ?? 0)}
                hint={
                  entry.stats && entry.stats.com > 0
                    ? `${fmtEur(entry.stats.com)} com.`
                    : '—'
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-composants ──────────────────────────────────────────

interface KpiProps {
  label: string
  value: string
  hint?: string
  color?: string
}

function Kpi({ label, value, hint, color }: KpiProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          margin: '6px 0 2px',
          color: color ?? '#0f172a',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ color: '#94a3b8', fontSize: 12 }}>{hint}</div>
      )}
    </div>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
      }}
    >
      {title && (
        <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>{title}</h3>
      )}
      {children}
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
      {label}
    </div>
  )
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
}
const trHeadStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 11,
  fontWeight: 600,
}
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }

export default Dashboard
