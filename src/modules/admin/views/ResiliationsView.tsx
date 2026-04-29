import { useEffect, useMemo, useState } from 'react'
import { fetchContratsResiliations } from '../api'
import {
  RESILIATION_ETAPE_LABELS,
  type ContratResiliation,
  type ResiliationEtape,
} from '../types'
import type { DateRange } from '../components/DateRangeSelector'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

function rowBg(r: ContratResiliation): string {
  switch (r.resiliation_etape) {
    case 'aucune':
      return r.resiliation_attendue ? '#fef2f2' : 'transparent'
    case 'a_planifier':
      return '#fefce8'
    case 'envoyee_attente_ar':
      return '#fff7ed'
    case 'ar_recu':
      return '#f0fdf4'
    case 'refusee':
      return '#fef2f2'
  }
}

function isATraiter(r: ContratResiliation): boolean {
  // Ignore les contrats sans résiliation et où elle n'est pas attendue
  // (obsèques, animal, multi-équip, etc.)
  if (r.resiliation_etape === 'aucune' && !r.resiliation_attendue) return false
  return RESILIATION_ETAPE_LABELS[r.resiliation_etape].categorie === 'a_traiter'
}

function isFinalise(r: ContratResiliation): boolean {
  return RESILIATION_ETAPE_LABELS[r.resiliation_etape].categorie === 'finalise'
}

interface Props {
  dateRange: DateRange
  onContratClick?: (id: string) => void
}

export function ResiliationsView({ dateRange, onContratClick }: Props) {
  const [data, setData] = useState<ContratResiliation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchContratsResiliations(dateRange.debut, dateRange.fin)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [dateRange.debut, dateRange.fin])

  const aTraiter = useMemo(() => data.filter(isATraiter), [data])
  const finalise = useMemo(() => data.filter(isFinalise), [data])

  const stats = useMemo(() => {
    const byEtape: Record<ResiliationEtape, number> = {
      aucune: 0, a_planifier: 0, envoyee_attente_ar: 0, ar_recu: 0, refusee: 0,
    }
    let oublis = 0
    for (const r of data) {
      byEtape[r.resiliation_etape]++
      if (r.resiliation_etape === 'aucune' && r.resiliation_attendue) oublis++
    }
    return {
      oublis,
      a_planifier: byEtape.a_planifier,
      attente_ar: byEtape.envoyee_attente_ar,
      ar_recu: byEtape.ar_recu,
    }
  }, [data])

  if (loading) return <div style={{ padding: 16, color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ padding: 16, color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
        }}
      >
        <StatCard
          color="#b91c1c"
          bg="#fee2e2"
          label="Oublis potentiels"
          value={stats.oublis}
          hint="Mutuelles sans résiliation prévue"
        />
        <StatCard
          color="#854d0e"
          bg="#fef9c3"
          label="À planifier"
          value={stats.a_planifier}
        />
        <StatCard
          color="#9a3412"
          bg="#ffedd5"
          label="Attente AR"
          value={stats.attente_ar}
        />
        <StatCard
          color="#047857"
          bg="#d1fae5"
          label="AR reçu"
          value={stats.ar_recu}
        />
      </div>

      <Section
        title={`🚨 À traiter / À vérifier (${aTraiter.length})`}
        emptyText="Aucune résiliation en attente — tout est sous contrôle."
      >
        <Table rows={aTraiter} onContratClick={onContratClick} />
      </Section>

      <Section
        title={`✅ Finalisé (${finalise.length})`}
        emptyText="Aucune résiliation finalisée sur cette période."
      >
        <Table rows={finalise} onContratClick={onContratClick} />
      </Section>
    </div>
  )
}

function StatCard({
  color,
  bg,
  label,
  value,
  hint,
}: {
  color: string
  bg: string
  label: string
  value: number
  hint?: string
}) {
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${color}20`,
        borderRadius: 10,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1 }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: '#64748b' }}>{hint}</div>
      )}
    </div>
  )
}

function Section({
  title,
  emptyText,
  children,
}: {
  title: string
  emptyText: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
        {title}
      </div>
      {Array.isArray(children) ||
      (typeof children === 'object' && children !== null) ? (
        children
      ) : null}
      <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', display: 'none' }}>
        {emptyText}
      </div>
    </div>
  )
}

function Table({
  rows,
  onContratClick,
}: {
  rows: ContratResiliation[]
  onContratClick?: (id: string) => void
}) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 24,
          color: '#94a3b8',
          fontStyle: 'italic',
          fontSize: 13,
          textAlign: 'center',
        }}
      >
        Aucune ligne dans cette section.
      </div>
    )
  }
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        overflowX: 'auto',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600, background: '#f8fafc' }}>
            <th style={th}>Client</th>
            <th style={th}>Compagnie</th>
            <th style={th}>Type</th>
            <th style={th}>Date sign.</th>
            <th style={th}>Type résil.</th>
            <th style={th}>Statut</th>
            <th style={th}>Date envoi</th>
            <th style={thC}>Dépôt</th>
            <th style={th}>Date AR</th>
            <th style={thC}>AR</th>
            <th style={thR}>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.contrat_id} style={{ borderTop: '1px solid #f1f5f9', background: rowBg(r) }}>
              <td style={{ ...td, fontWeight: 600 }}>{r.client}</td>
              <td style={td}>{r.compagnie_assureur ?? '—'}</td>
              <td style={td}>{r.type_contrat ?? '—'}</td>
              <td style={{ ...td, color: '#94a3b8' }}>{fmtDate(r.date_signature)}</td>
              <td style={td}>{r.type_resiliation ?? '—'}</td>
              <td style={td}>
                <StatutBadge etape={r.resiliation_etape} attendue={r.resiliation_attendue} />
              </td>
              <td style={{ ...td, color: '#94a3b8' }}>{fmtDate(r.resiliation_date_envoi)}</td>
              <td style={tdC}>
                {r.resiliation_url_depot ? (
                  <a
                    href={r.resiliation_url_depot}
                    target="_blank"
                    rel="noreferrer"
                    title="Voir la preuve de dépôt"
                    style={pdfLink}
                  >
                    📄
                  </a>
                ) : (
                  <span style={{ color: '#cbd5e1' }}>—</span>
                )}
              </td>
              <td style={{ ...td, color: '#94a3b8' }}>{fmtDate(r.resiliation_date_ar)}</td>
              <td style={tdC}>
                {r.resiliation_url_ar ? (
                  <a
                    href={r.resiliation_url_ar}
                    target="_blank"
                    rel="noreferrer"
                    title="Voir l'AR"
                    style={pdfLink}
                  >
                    📄
                  </a>
                ) : (
                  <span style={{ color: '#cbd5e1' }}>—</span>
                )}
              </td>
              <td style={{ ...td, textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => onContratClick?.(r.contrat_id)}
                  style={btnLink}
                >
                  Voir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatutBadge({
  etape,
  attendue,
}: {
  etape: ResiliationEtape
  attendue: boolean
}) {
  if (etape === 'aucune') {
    if (attendue) {
      return (
        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 12,
            background: '#fee2e2',
            color: '#b91c1c',
          }}
        >
          ⚠️ Oubli potentiel
        </span>
      )
    }
    return (
      <span
        style={{
          display: 'inline-block',
          fontSize: 11,
          fontWeight: 500,
          padding: '3px 8px',
          borderRadius: 12,
          background: '#f1f5f9',
          color: '#64748b',
        }}
      >
        Pas applicable
      </span>
    )
  }
  const cfg = RESILIATION_ETAPE_LABELS[etape]
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 12,
        background: cfg.bg,
        color: cfg.fg,
      }}
    >
      {cfg.label}
    </span>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
}
const thR: React.CSSProperties = { ...th, textAlign: 'right' }
const thC: React.CSSProperties = { ...th, textAlign: 'center' }
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' }
const tdC: React.CSSProperties = { ...td, textAlign: 'center' }
const pdfLink: React.CSSProperties = {
  fontSize: 16,
  textDecoration: 'none',
  color: '#1f3a8a',
}
const btnLink: React.CSSProperties = {
  background: 'transparent',
  color: '#1f3a8a',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  padding: '4px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}
