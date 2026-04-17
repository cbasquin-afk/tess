import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Badge, Modal } from '@/shared/ui'
import {
  fetchVersementsAttendus,
  fetchVersementsAttendusDetail,
} from '../api'
import {
  tableStyle,
  trHead,
  th,
  thRight,
  td,
  tdMontant,
  trFooter,
  tdFooterLabel,
  tdFooterMontant,
  trBody,
  MONO,
} from '../styles/tableTokens'
import type { VersementAttendu, VersementAttenduDetail } from '../types'
import { GROSSISTES } from '../types'

const MOIS_NOMS = [
  '',
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const

function fmtEur(n: number): string {
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

const grossisteSet = new Set<string>(GROSSISTES as unknown as string[])
function isGrossiste(c: string): boolean {
  return grossisteSet.has(c.toUpperCase())
}

interface PeriodGroup {
  label: string
  annee: number
  mois: number
  rows: VersementAttendu[]
  total: number
}

function Versements() {
  const [data, setData] = useState<VersementAttendu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [annee, setAnnee] = useState(() => new Date().getFullYear())
  const [moisFiltre, setMoisFiltre] = useState<number | ''>('')

  const [drillTarget, setDrillTarget] = useState<{
    compagnie: string
    annee: number
    mois: number
  } | null>(null)
  const [drillData, setDrillData] = useState<VersementAttenduDetail[]>([])
  const [drillLoading, setDrillLoading] = useState(false)
  const [drillFilter, setDrillFilter] = useState<'' | 'commission' | 'renouvellement'>('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchVersementsAttendus()
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const annees = useMemo(() => {
    const set = new Set<number>()
    for (const r of data) set.add(r.annee)
    set.add(new Date().getFullYear())
    return Array.from(set).sort((a, b) => b - a)
  }, [data])

  const groups = useMemo<PeriodGroup[]>(() => {
    const filtered = data.filter((r) => {
      if (r.annee !== annee) return false
      if (moisFiltre !== '' && r.mois !== moisFiltre) return false
      return true
    })
    const byPeriod = new Map<string, VersementAttendu[]>()
    for (const r of filtered) {
      const key = `${r.annee}-${r.mois}`
      const arr = byPeriod.get(key) ?? []
      arr.push(r)
      byPeriod.set(key, arr)
    }
    return Array.from(byPeriod.entries())
      .map(([, rows]) => {
        const first = rows[0]!
        rows.sort((a, b) => (b.montant_attendu ?? 0) - (a.montant_attendu ?? 0))
        return {
          label: `${MOIS_NOMS[first.mois] ?? first.mois} ${first.annee}`,
          annee: first.annee,
          mois: first.mois,
          rows,
          total: rows.reduce((s, r) => s + (r.montant_attendu ?? 0), 0),
        }
      })
      .sort((a, b) => a.mois - b.mois)
  }, [data, annee, moisFiltre])

  const handleDrill = useCallback(
    async (compagnie: string, a: number, m: number) => {
      setDrillTarget({ compagnie, annee: a, mois: m })
      setDrillLoading(true)
      setDrillFilter('')
      try {
        setDrillData(await fetchVersementsAttendusDetail(compagnie, a, m))
      } catch {
        setDrillData([])
      } finally {
        setDrillLoading(false)
      }
    },
    [],
  )

  const drillFiltered = useMemo(() => {
    if (!drillFilter) return drillData
    return drillData.filter((d) => d.type_ligne === drillFilter)
  }, [drillData, drillFilter])

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Versements attendus</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Commissions que chaque compagnie doit verser à Tessoria, calculées depuis les commissions prévues.
        </p>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={labelStyle}>Année</label>
          <select
            value={annee}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setAnnee(parseInt(e.target.value, 10))}
            style={inputStyle}
          >
            {annees.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={labelStyle}>Mois</label>
          <select
            value={moisFiltre}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setMoisFiltre(e.target.value === '' ? '' : parseInt(e.target.value, 10))
            }
            style={inputStyle}
          >
            <option value="">Tous</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{MOIS_NOMS[m]}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          {groups.length} période{groups.length > 1 ? 's' : ''} ·{' '}
          {groups.reduce((s, g) => s + g.rows.length, 0)} lignes
        </span>
      </div>

      {groups.length === 0 && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 32,
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: 13,
          }}
        >
          Aucun versement attendu pour cette période.
        </div>
      )}

      {groups.map((g) => (
        <div
          key={`${g.annee}-${g.mois}`}
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 18,
            overflowX: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15 }}>{g.label}</h3>
            <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: '#00C18B' }}>
              {fmtEur(g.total)}
            </span>
          </div>

          <table style={{ ...tableStyle, tableLayout: 'auto' }}>
            <thead>
              <tr style={trHead}>
                <th style={th}>Compagnie</th>
                <th style={thRight}>Contrats</th>
                <th style={thRight}>Acq.</th>
                <th style={thRight}>Renouv.</th>
                <th style={thRight}>Montant acq.</th>
                <th style={thRight}>Montant renouv.</th>
                <th style={thRight}>Total</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => (
                <tr
                  key={r.compagnie}
                  onClick={() => void handleDrill(r.compagnie, r.annee, r.mois)}
                  style={{ ...trBody, cursor: 'pointer' }}
                >
                  <td style={{ ...td, fontWeight: 600, color: '#0f172a' }}>
                    {r.compagnie}
                    <span style={{ marginLeft: 8 }}>
                      <Badge tone={isGrossiste(r.compagnie) ? 'info' : 'neutral'}>
                        {isGrossiste(r.compagnie) ? 'Grossiste' : 'Direct'}
                      </Badge>
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: 'right', color: '#64748b' }}>{r.nb_contrats}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#1D9E75' }}>{r.nb_acquisitions}</td>
                  <td style={{ ...td, textAlign: 'right', color: '#BA7517' }}>{r.nb_renouvellements}</td>
                  <td style={{ ...tdMontant, color: '#1D9E75' }}>{fmtEur(r.montant_acquisition ?? 0)}</td>
                  <td style={{ ...tdMontant, color: '#BA7517' }}>{fmtEur(r.montant_renouvellement ?? 0)}</td>
                  <td style={{ ...tdMontant, color: '#0f172a', fontWeight: 700 }}>{fmtEur(r.montant_attendu ?? 0)}</td>
                </tr>
              ))}
              <tr style={trFooter}>
                <td style={tdFooterLabel}>Total {g.label}</td>
                <td style={{ ...tdFooterMontant, color: '#64748b' }}>
                  {g.rows.reduce((s, r) => s + r.nb_contrats, 0)}
                </td>
                <td style={{ ...tdFooterMontant, color: '#1D9E75' }}>
                  {g.rows.reduce((s, r) => s + r.nb_acquisitions, 0)}
                </td>
                <td style={{ ...tdFooterMontant, color: '#BA7517' }}>
                  {g.rows.reduce((s, r) => s + r.nb_renouvellements, 0)}
                </td>
                <td style={{ ...tdFooterMontant, color: '#1D9E75' }}>
                  {fmtEur(g.rows.reduce((s, r) => s + (r.montant_acquisition ?? 0), 0))}
                </td>
                <td style={{ ...tdFooterMontant, color: '#BA7517' }}>
                  {fmtEur(g.rows.reduce((s, r) => s + (r.montant_renouvellement ?? 0), 0))}
                </td>
                <td style={tdFooterMontant}>{fmtEur(g.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {/* Drill-down modal */}
      <Modal
        open={drillTarget !== null}
        onClose={() => setDrillTarget(null)}
        title={
          drillTarget
            ? `${drillTarget.compagnie} — ${MOIS_NOMS[drillTarget.mois] ?? drillTarget.mois} ${drillTarget.annee}`
            : ''
        }
      >
        {drillLoading ? (
          <div style={{ color: '#64748b', fontSize: 13, padding: 16 }}>Chargement…</div>
        ) : drillData.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', padding: 16 }}>
            Aucune ligne.
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
              {([
                { key: '' as const, label: 'Tous' },
                { key: 'commission' as const, label: 'Acquisitions' },
                { key: 'renouvellement' as const, label: 'Renouvellements' },
              ]).map((f) => {
                const active = drillFilter === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => setDrillFilter(f.key)}
                    style={{
                      padding: '4px 12px',
                      fontSize: 11,
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: active ? '#1f3a8a' : '#f3f4f6',
                      color: active ? '#fff' : '#64748b',
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
                {drillFiltered.length} / {drillData.length} lignes
              </span>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: 420, overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#64748b', fontSize: 10, fontWeight: 600 }}>
                    <th style={subTh}>Client</th>
                    <th style={subTh}>Type contrat</th>
                    <th style={subTh}>Date sig.</th>
                    <th style={subTh}>Type com.</th>
                    <th style={{ ...subTh, textAlign: 'right' }}>Cotis./mois</th>
                    <th style={subTh}>Catégorie</th>
                    <th style={{ ...subTh, textAlign: 'right' }}>Montant prévu</th>
                  </tr>
                </thead>
                <tbody>
                  {drillFiltered.map((d) => (
                    <tr key={d.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={subTd}>
                        <strong style={{ color: '#0f172a' }}>{d.client}</strong>
                      </td>
                      <td style={{ ...subTd, color: '#475569' }}>{d.type_contrat ?? '—'}</td>
                      <td style={{ ...subTd, color: '#94a3b8', fontFamily: MONO, fontSize: 10 }}>
                        {fmtDate(d.date_signature)}
                      </td>
                      <td style={{ ...subTd, color: '#94a3b8', fontSize: 10 }}>
                        {d.type_commission ?? '—'}
                      </td>
                      <td style={{ ...subTd, textAlign: 'right', fontFamily: MONO, color: '#475569' }}>
                        {d.cotisation_mensuelle ? `${fmtEur(d.cotisation_mensuelle)}/m` : '—'}
                      </td>
                      <td style={subTd}>
                        <Badge tone={d.type_ligne === 'commission' ? 'success' : 'warning'}>
                          {d.type_ligne === 'commission' ? 'Acq.' : 'Renouv.'}
                        </Badge>
                      </td>
                      <td style={{ ...subTd, textAlign: 'right', fontFamily: MONO, fontWeight: 600, color: '#0f172a' }}>
                        {fmtEur(d.montant_com_societe ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 12, textAlign: 'right', fontFamily: MONO, fontSize: 13, fontWeight: 700, color: '#00C18B' }}>
              Total : {fmtEur(drillFiltered.reduce((s, d) => s + (d.montant_com_societe ?? 0), 0))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

const subTh: React.CSSProperties = {
  textAlign: 'left',
  padding: '4px 8px',
  borderBottom: '1px solid #e5e7eb',
  position: 'sticky',
  top: 0,
  background: '#fff',
}
const subTd: React.CSSProperties = { padding: '6px 8px' }
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#64748b' }
const inputStyle: React.CSSProperties = {
  background: '#f9fafb',
  border: '1px solid #d1d5db',
  color: '#374151',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  outline: 'none',
}

export default Versements
