import { Fragment, useEffect, useMemo, useState } from 'react'
import TessPerfLayout from '../components/TessPerfLayout'
import { useWeeklyDataCommercial } from '../hooks/useWeeklyData'
import {
  fetchDailyKpisCommercial,
  fetchDailyParOrigineCommercial,
  fetchWeeklyParOrigineCommercial,
} from '../api'
import type {
  DailyKpisCommercial,
  DailyParOrigineCommercial,
  Origine,
  WeeklyKpis,
  WeeklyParOrigineCommercial,
} from '../types'
import { fmtEUR, fmtInt, fmtPct } from '../utils/format'

const JOURS_COURT: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim',
}

function monthRange(annee: number, mois: number): { debut: string; fin: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const debut = `${annee}-${pad(mois)}-01`
  const finDate = new Date(annee, mois, 0)
  const fin = `${annee}-${pad(mois)}-${pad(finDate.getDate())}`
  return { debut, fin }
}

function fmtWeekLabel(ws: string, wf: string): string {
  const d = (iso: string) => {
    const dt = new Date(iso)
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`
  }
  return `${d(ws)} → ${d(wf)}`
}

function fmtDayShort(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Shape commune pour les lignes semaine (filtré ou non). */
interface WeekLine {
  semaine_debut: string
  semaine_fin: string
  nb_decroches: number
  nb_signes: number
  taux_conversion_pct: number
  ca: number
  nb_mutuelles: number
  nb_multi_equip: number
  nb_frais_service: number
}

interface DayLine {
  jour: string
  isodow: number
  nb_decroches: number
  nb_signes: number
  taux_conversion_pct: number
  ca: number
  // Sous-colonnes affichées uniquement quand filtre inactif
  nb_signes_mutuelle?: number
  nb_signes_multi_equip?: number
  nb_frais_service?: number
}

function toWeekLineNonFiltered(w: WeeklyKpis): WeekLine {
  return {
    semaine_debut: w.semaine_debut,
    semaine_fin: w.semaine_fin,
    nb_decroches: Number(w.nb_decroches),
    nb_signes: Number(w.nb_contrats_signes),
    taux_conversion_pct: Number(w.taux_conversion_pct),
    ca: Number(w.ca_acquisition),
    nb_mutuelles: Number(w.nb_mutuelles),
    nb_multi_equip: Number(w.nb_multi_equip),
    nb_frais_service: Number(w.nb_frais_service),
  }
}

function toWeekLineFiltered(w: WeeklyParOrigineCommercial): WeekLine {
  return {
    semaine_debut: w.semaine_debut,
    semaine_fin: w.semaine_fin,
    nb_decroches: Number(w.nb_decroches),
    nb_signes: Number(w.nb_contrats_signes),
    taux_conversion_pct: Number(w.taux_conversion_pct),
    ca: Number(w.ca_acquisition),
    nb_mutuelles: Number(w.nb_contrats_mutuelle),
    nb_multi_equip: 0, // pas de ventilation produit dans la vue par_origine_commercial
    nb_frais_service: Number(w.nb_frais_service),
  }
}

function toDayLineNonFiltered(d: DailyKpisCommercial): DayLine {
  return {
    jour: d.jour,
    isodow: Number(d.isodow),
    nb_decroches: Number(d.nb_decroches_mapapp),
    nb_signes: Number(d.nb_signes_productifs),
    taux_conversion_pct: Number(d.taux_conversion_pct),
    ca: Number(d.ca_acquisition),
    nb_signes_mutuelle: Number(d.nb_signes_mutuelle),
    nb_signes_multi_equip: Number(d.nb_signes_multi_equip),
    nb_frais_service: Number(d.nb_frais_service),
  }
}

function toDayLineFiltered(d: DailyParOrigineCommercial): DayLine {
  return {
    jour: d.jour,
    isodow: Number(d.isodow),
    nb_decroches: Number(d.nb_decroches),
    nb_signes: Number(d.nb_signes),
    taux_conversion_pct: Number(d.taux_conversion_pct),
    ca: Number(d.ca_acquisition),
  }
}

export default function WeeklyCommercial() {
  return (
    <TessPerfLayout section="hebdomadaire" scope="commercial">
      {({ annee, mois, origine, activeCommercialId }) =>
        activeCommercialId ? (
          <WeeklyContent
            id={activeCommercialId}
            annee={annee}
            mois={mois}
            origine={origine}
          />
        ) : null
      }
    </TessPerfLayout>
  )
}

function WeeklyContent({
  id,
  annee,
  mois,
  origine,
}: {
  id: string
  annee: number
  mois: number
  origine: Origine
}) {
  const { debut, fin } = useMemo(() => monthRange(annee, mois), [annee, mois])
  const origineActive = origine !== 'toutes'
  const {
    data: baseRows,
    loading: loadingBase,
    error: errorBase,
  } = useWeeklyDataCommercial(id, debut, fin)

  const [filteredRows, setFilteredRows] = useState<WeeklyParOrigineCommercial[] | null>(null)
  const [loadingFiltered, setLoadingFiltered] = useState(false)
  const [errorFiltered, setErrorFiltered] = useState<string | null>(null)

  useEffect(() => {
    if (!origineActive) {
      setFilteredRows(null)
      return
    }
    let cancelled = false
    setLoadingFiltered(true)
    setErrorFiltered(null)
    fetchWeeklyParOrigineCommercial(id, annee, mois, origine)
      .then((d) => { if (!cancelled) setFilteredRows(d ?? []) })
      .catch((e: unknown) => {
        if (!cancelled) setErrorFiltered(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoadingFiltered(false) })
    return () => { cancelled = true }
  }, [id, annee, mois, origine, origineActive])

  const [expanded, setExpanded] = useState<string | null>(null)
  const [daily, setDaily] = useState<Record<string, DayLine[]>>({})
  const [loadingDay, setLoadingDay] = useState<string | null>(null)

  // Reset l'état de drill-down quand on change de commercial ou d'origine.
  useEffect(() => {
    setExpanded(null)
    setDaily({})
  }, [id, origine])

  const lines: WeekLine[] = useMemo(() => {
    if (origineActive) return (filteredRows ?? []).map(toWeekLineFiltered)
    return baseRows.map(toWeekLineNonFiltered)
  }, [origineActive, filteredRows, baseRows])

  async function toggle(line: WeekLine) {
    if (expanded === line.semaine_debut) {
      setExpanded(null)
      return
    }
    setExpanded(line.semaine_debut)
    if (!daily[line.semaine_debut]) {
      setLoadingDay(line.semaine_debut)
      try {
        let mapped: DayLine[]
        if (origineActive) {
          const d = await fetchDailyParOrigineCommercial(
            id,
            line.semaine_debut,
            line.semaine_fin,
            origine,
          )
          mapped = (d ?? []).map(toDayLineFiltered)
        } else {
          const d = await fetchDailyKpisCommercial(id, line.semaine_debut, line.semaine_fin)
          mapped = d.map(toDayLineNonFiltered)
        }
        setDaily((prev) => ({ ...prev, [line.semaine_debut]: mapped }))
      } catch {
        /* silent */
      } finally {
        setLoadingDay(null)
      }
    }
  }

  const loading = origineActive ? loadingFiltered : loadingBase
  const error = origineActive ? errorFiltered : errorBase

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>
  if (lines.length === 0) {
    return (
      <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: 32, textAlign: 'center' }}>
        {origineActive
          ? `Aucune donnée pour l'origine « ${origine} » sur ce mois.`
          : 'Pas de semaines sur ce mois.'}
      </div>
    )
  }

  const totals = lines.reduce(
    (t, w) => ({
      dec: t.dec + w.nb_decroches,
      sig: t.sig + w.nb_signes,
      ca: t.ca + w.ca,
      mut: t.mut + w.nb_mutuelles,
      me: t.me + w.nb_multi_equip,
      fr: t.fr + w.nb_frais_service,
    }),
    { dec: 0, sig: 0, ca: 0, mut: 0, me: 0, fr: 0 },
  )

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
            <th style={th}>Semaine</th>
            <th style={thR}>Décrochés</th>
            <th style={thR}>Signés</th>
            <th style={thR}>Tx conv</th>
            <th style={thR}>CA</th>
            <th style={thR}>Mutuelles</th>
            {!origineActive && <th style={thR}>Multi-éq</th>}
            <th style={thR}>Frais serv.</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((w) => {
            const isOpen = expanded === w.semaine_debut
            const days = daily[w.semaine_debut] ?? []
            return (
              <Fragment key={w.semaine_debut}>
                <tr
                  onClick={() => void toggle(w)}
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    background: isOpen ? '#f8fafc' : undefined,
                  }}
                >
                  <td style={{ ...td, fontWeight: 500 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        marginRight: 6,
                        color: '#94a3b8',
                        fontSize: 10,
                        transform: isOpen ? 'rotate(90deg)' : 'rotate(0)',
                        transition: 'transform .15s',
                      }}
                    >
                      ▶
                    </span>
                    {fmtWeekLabel(w.semaine_debut, w.semaine_fin)}
                  </td>
                  <td style={tdNum}>{fmtInt(w.nb_decroches)}</td>
                  <td style={tdNum}>{fmtInt(w.nb_signes)}</td>
                  <td style={tdNum}>
                    {w.nb_decroches > 0 ? fmtPct(w.taux_conversion_pct) : '—'}
                  </td>
                  <td style={{ ...tdNum, fontWeight: 700, color: '#0f172a' }}>
                    {fmtEUR(w.ca)}
                  </td>
                  <td style={tdNum}>{fmtInt(w.nb_mutuelles)}</td>
                  {!origineActive && <td style={tdNum}>{fmtInt(w.nb_multi_equip)}</td>}
                  <td style={tdNum}>{fmtInt(w.nb_frais_service)}</td>
                </tr>
                {isOpen && (
                  <>
                    {loadingDay === w.semaine_debut && days.length === 0 && (
                      <tr style={{ background: '#fafbfc' }}>
                        <td colSpan={origineActive ? 7 : 8} style={{ ...td, color: '#94a3b8', fontStyle: 'italic' }}>
                          Chargement du détail journalier…
                        </td>
                      </tr>
                    )}
                    {days.map((d) => (
                      <tr key={d.jour} style={{ background: '#fafbfc' }}>
                        <td style={{ ...td, paddingLeft: 32, fontSize: 12, color: '#475569' }}>
                          {JOURS_COURT[d.isodow] ?? ''} {fmtDayShort(d.jour)}
                        </td>
                        <td style={tdSubNum}>{fmtInt(d.nb_decroches)}</td>
                        <td style={tdSubNum}>{fmtInt(d.nb_signes)}</td>
                        <td style={tdSubNum}>
                          {d.nb_decroches > 0 ? fmtPct(d.taux_conversion_pct) : '—'}
                        </td>
                        <td style={{ ...tdSubNum, color: '#0f172a', fontWeight: 600 }}>
                          {fmtEUR(d.ca)}
                        </td>
                        <td style={tdSubNum}>
                          {d.nb_signes_mutuelle != null ? fmtInt(d.nb_signes_mutuelle) : '—'}
                        </td>
                        {!origineActive && (
                          <td style={tdSubNum}>
                            {d.nb_signes_multi_equip != null ? fmtInt(d.nb_signes_multi_equip) : '—'}
                          </td>
                        )}
                        <td style={tdSubNum}>
                          {d.nb_frais_service != null ? fmtInt(d.nb_frais_service) : '—'}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </Fragment>
            )
          })}
          <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
            <td style={td}>Total mois</td>
            <td style={tdNum}>{fmtInt(totals.dec)}</td>
            <td style={tdNum}>{fmtInt(totals.sig)}</td>
            <td style={{ ...tdNum, color: '#94a3b8' }}>—</td>
            <td style={{ ...tdNum, color: '#0f172a' }}>{fmtEUR(totals.ca)}</td>
            <td style={tdNum}>{fmtInt(totals.mut)}</td>
            {!origineActive && <td style={tdNum}>{fmtInt(totals.me)}</td>}
            <td style={tdNum}>{fmtInt(totals.fr)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

const MONO = "'JetBrains Mono', ui-monospace, monospace"
const th: React.CSSProperties = {
  textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
}
const thR: React.CSSProperties = { ...th, textAlign: 'right' }
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' }
const tdNum: React.CSSProperties = {
  ...td, textAlign: 'right', fontFamily: MONO, whiteSpace: 'nowrap',
}
const tdSubNum: React.CSSProperties = {
  ...tdNum, padding: '6px 12px', fontSize: 12, color: '#475569',
}
