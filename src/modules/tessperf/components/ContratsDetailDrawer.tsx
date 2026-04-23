import { useMemo } from 'react'
import { useContratsDetail } from '../hooks/useContratsDetail'
import type { ContratDetail } from '../types'
import { fmtEUR, fmtEURDecimal } from '../utils/format'

interface Props {
  open: boolean
  onClose: () => void
  commercialId: string
  commercialPrenom: string
  annee: number
  mois: number
}

const MOIS_NOMS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v)
  if (/["\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function exportCsv(rows: ContratDetail[], prenom: string, annee: number, mois: number) {
  const header = [
    'Date', 'Client', 'Compagnie', 'Produit', 'Source', 'Type commission',
    'Cotisation mensuelle', 'Frais service', 'CA acquisition', 'CA total',
    'Workflow', 'Statut compagnie',
  ]
  const lines = rows.map((r) => [
    r.date_signature,
    r.client,
    r.compagnie_assureur,
    r.type_produit,
    r.source,
    r.type_commission ?? '',
    r.cotisation_mensuelle ?? '',
    r.frais_service ?? '',
    r.ca_acquisition ?? 0,
    r.ca_total ?? 0,
    r.workflow_statut,
    r.statut_compagnie ?? '',
  ].map(csvEscape).join(';'))
  const csv = '\uFEFF' + [header.join(';'), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `contrats-${prenom}-${annee}-${String(mois).padStart(2, '0')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function ContratsDetailDrawer({
  open,
  onClose,
  commercialId,
  commercialPrenom,
  annee,
  mois,
}: Props) {
  const { data, loading, error } = useContratsDetail(commercialId, annee, mois, open)

  const totals = useMemo(() => {
    const t = {
      cotisation: 0,
      frais: 0,
      ca_acq: 0,
      ca_total: 0,
    }
    for (const r of data) {
      t.cotisation += Number(r.cotisation_mensuelle ?? 0)
      t.frais += Number(r.frais_service ?? 0)
      t.ca_acq += Number(r.ca_acquisition ?? 0)
      t.ca_total += Number(r.ca_total ?? 0)
    }
    return t
  }, [data])

  if (!open) return null

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          zIndex: 900,
        }}
      />
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(1000px, 96vw)',
          background: '#fff',
          zIndex: 1000,
          boxShadow: '-8px 0 24px rgba(15,23,42,0.25)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Drill-down CA
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              Contrats signés de {commercialPrenom} — {MOIS_NOMS[mois]} {annee}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              {data.length} contrat{data.length > 1 ? 's' : ''} ·{' '}
              <strong style={{ color: '#0f172a' }}>{fmtEUR(totals.ca_acq)}</strong> de CA acquisition
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => exportCsv(data, commercialPrenom, annee, mois)}
              disabled={data.length === 0}
              style={btnSecondary}
            >
              Exporter CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: 'none',
                background: '#f1f5f9',
                color: '#475569',
                width: 32,
                height: 32,
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 600,
              }}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Chargement…</div>
          ) : error ? (
            <div style={{ color: '#dc2626', fontSize: 13 }}>Erreur : {error}</div>
          ) : data.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', padding: 32, textAlign: 'center' }}>
              Aucun contrat signé sur ce mois.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600, background: '#f8fafc' }}>
                    <th style={th}>Date</th>
                    <th style={th}>Client</th>
                    <th style={th}>Compagnie</th>
                    <th style={th}>Produit</th>
                    <th style={th}>Source</th>
                    <th style={thR}>Cotisation</th>
                    <th style={thR}>Frais</th>
                    <th style={thR}>CA acq.</th>
                    <th style={thR}>CA total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ ...td, color: '#94a3b8', fontFamily: MONO, fontSize: 12 }}>
                        {fmtDate(r.date_signature)}
                      </td>
                      <td style={{ ...td, color: '#0f172a', fontWeight: 500 }}>{r.client}</td>
                      <td style={td}>{r.compagnie_assureur}</td>
                      <td style={{ ...td, color: '#475569' }}>{r.type_produit}</td>
                      <td style={{ ...td, color: '#475569', fontSize: 11 }}>{r.source}</td>
                      <td style={tdNum}>{fmtEURDecimal(r.cotisation_mensuelle)}</td>
                      <td style={{ ...tdNum, color: r.frais_service ? '#0f172a' : '#cbd5e1' }}>
                        {r.frais_service ? fmtEURDecimal(r.frais_service) : '—'}
                      </td>
                      <td style={{ ...tdNum, fontWeight: 600, color: '#0f172a' }}>
                        {fmtEUR(r.ca_acquisition)}
                      </td>
                      <td style={{ ...tdNum, color: '#64748b' }}>{fmtEUR(r.ca_total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
                    <td style={td} colSpan={5}>
                      Total ({data.length})
                    </td>
                    <td style={tdNum}>{fmtEURDecimal(totals.cotisation)}</td>
                    <td style={tdNum}>{fmtEURDecimal(totals.frais)}</td>
                    <td style={{ ...tdNum, color: '#0f172a' }}>{fmtEUR(totals.ca_acq)}</td>
                    <td style={{ ...tdNum, color: '#64748b' }}>{fmtEUR(totals.ca_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

const MONO = "'JetBrains Mono', ui-monospace, monospace"
const th: React.CSSProperties = {
  textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
}
const thR: React.CSSProperties = { ...th, textAlign: 'right' }
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' }
const tdNum: React.CSSProperties = {
  ...td,
  textAlign: 'right',
  fontFamily: MONO,
  whiteSpace: 'nowrap',
}
const btnSecondary: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
  background: '#fff',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  cursor: 'pointer',
}
