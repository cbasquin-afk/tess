import { Fragment, useEffect, useMemo, useState } from 'react'
import TessPerfLayout from '../components/TessPerfLayout'
import { useWeeklyEquipe } from '../hooks/useWeeklyEquipe'
import {
  fetchDailyKpisEquipe,
  fetchDailyParOrigineEquipe,
  fetchWeeklyParOrigine,
} from '../api'
import type {
  DailyKpisEquipe,
  DailyParOrigineEquipe,
  Origine,
  WeeklyEquipe as WeeklyRow,
  WeeklyParOrigine,
} from '../types'
import { fmtEUR, fmtInt, fmtPct } from '../utils/format'

const JOURS_COURT: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim',
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

function pctColor(pct: number): string {
  if (pct >= 90) return '#047857'
  if (pct >= 70) return '#b45309'
  if (pct > 0) return '#b91c1c'
  return '#94a3b8'
}

/** Shape commune pour l'affichage des lignes semaine (filtré ou non). */
interface WeekLine {
  semaine_debut: string
  semaine_fin: string
  nb_leads: number
  nb_decroches: number
  nb_signes: number
  taux_transfo_pct: number
  taux_conversion_pct: number
  ca: number
  objectif: number | null // null quand filtre origine actif
}

/** Shape commune pour les lignes jour (filtrées ou non). */
interface DayLine {
  jour: string
  isodow: number
  nb_leads: number
  nb_decroches: number
  nb_signes: number
  taux_transfo_pct: number
  taux_conversion_pct: number
  ca: number
  objectif: number
  pct_obj: number
}

function toWeekLineNonFiltered(w: WeeklyRow): WeekLine {
  return {
    semaine_debut: w.semaine_debut,
    semaine_fin: w.semaine_fin,
    nb_leads: Number(w.nb_leads_equipe_mapapp),
    nb_decroches: Number(w.nb_decroches_productifs),
    nb_signes: Number(w.nb_signes_productifs),
    taux_transfo_pct: Number(w.taux_transfo_pct),
    taux_conversion_pct: Number(w.taux_conversion_pct),
    ca: Number(w.ca_acquisition_productifs),
    objectif: Number(w.objectif_ca),
  }
}

function toWeekLineFiltered(w: WeeklyParOrigine): WeekLine {
  return {
    semaine_debut: w.semaine_debut,
    semaine_fin: w.semaine_fin,
    nb_leads: Number(w.nb_leads_equipe),
    nb_decroches: Number(w.nb_decroches_productifs),
    nb_signes: Number(w.nb_signes_productifs),
    taux_transfo_pct: Number(w.taux_transfo_pct),
    taux_conversion_pct: Number(w.taux_conversion_pct),
    ca: Number(w.ca_acquisition_productifs),
    objectif: null,
  }
}

function toDayLineNonFiltered(d: DailyKpisEquipe): DayLine {
  return {
    jour: d.jour,
    isodow: Number(d.isodow),
    nb_leads: Number(d.nb_leads_mapapp),
    nb_decroches: Number(d.nb_decroches_productifs_mapapp),
    nb_signes: Number(d.nb_signes_productifs),
    taux_transfo_pct: Number(d.taux_transfo_pct),
    taux_conversion_pct: Number(d.taux_conversion_pct),
    ca: Number(d.ca_acquisition_productifs),
    objectif: Number(d.objectif_ca_jour),
    pct_obj: Number(d.pct_objectif_jour),
  }
}

function toDayLineFiltered(d: DailyParOrigineEquipe): DayLine {
  return {
    jour: d.jour,
    isodow: Number(d.isodow),
    nb_leads: Number(d.nb_leads_equipe),
    nb_decroches: Number(d.nb_decroches_productifs),
    nb_signes: Number(d.nb_signes_productifs),
    taux_transfo_pct: Number(d.taux_transfo_pct),
    taux_conversion_pct: Number(d.taux_conversion_pct),
    ca: Number(d.ca_acquisition_productifs),
    objectif: 0,
    pct_obj: 0,
  }
}

export default function WeeklyEquipe() {
  return (
    <TessPerfLayout section="hebdomadaire" scope="equipe">
      {({ annee, mois, origine }) => (
        <WeeklyContent annee={annee} mois={mois} origine={origine} />
      )}
    </TessPerfLayout>
  )
}

function WeeklyContent({
  annee,
  mois,
  origine,
}: {
  annee: number
  mois: number
  origine: Origine
}) {
  const origineActive = origine !== 'toutes'
  // Base data (toujours chargée — on y lit l'objectif en mode non filtré)
  const { data: baseRows, loading: loadingBase, error: errorBase } = useWeeklyEquipe(annee, mois)
  // Data filtrée par origine quand filtre actif
  const [filteredRows, setFilteredRows] = useState<WeeklyParOrigine[] | null>(null)
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
    fetchWeeklyParOrigine(annee, mois, origine)
      .then((d) => { if (!cancelled) setFilteredRows(d ?? []) })
      .catch((e: unknown) => {
        if (!cancelled) setErrorFiltered(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoadingFiltered(false) })
    return () => { cancelled = true }
  }, [annee, mois, origine, origineActive])

  const [expanded, setExpanded] = useState<string | null>(null)
  const [daily, setDaily] = useState<Record<string, DayLine[]>>({})
  const [loadingDay, setLoadingDay] = useState<string | null>(null)

  // Reset cache drill-down quand le filtre change (les jours sont différents)
  useEffect(() => {
    setExpanded(null)
    setDaily({})
  }, [origine])

  const lines: WeekLine[] = useMemo(() => {
    if (origineActive) {
      return (filteredRows ?? []).map(toWeekLineFiltered)
    }
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
          const d = await fetchDailyParOrigineEquipe(line.semaine_debut, line.semaine_fin, origine)
          mapped = (d ?? []).map(toDayLineFiltered)
        } else {
          const d = await fetchDailyKpisEquipe(line.semaine_debut, line.semaine_fin)
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
      leads: t.leads + w.nb_leads,
      decroches: t.decroches + w.nb_decroches,
      signes: t.signes + w.nb_signes,
      ca: t.ca + w.ca,
      obj: t.obj + (w.objectif ?? 0),
    }),
    { leads: 0, decroches: 0, signes: 0, ca: 0, obj: 0 },
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
            <th style={thR}>{origineActive ? `Leads ${origine}` : 'Leads Mapapp'}</th>
            <th style={thR}>Décrochés prod</th>
            <th style={thR}>Signés prod</th>
            <th style={thR}>Tx transfo</th>
            <th style={thR}>Tx conv</th>
            <th style={thR}>CA prod</th>
            {!origineActive && <th style={thR}>Obj CA</th>}
            {!origineActive && <th style={thR}>% obj</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((w) => {
            const pct =
              w.objectif && w.objectif > 0 ? (w.ca / w.objectif) * 100 : 0
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
                  <td style={tdNum}>{fmtInt(w.nb_leads)}</td>
                  <td style={tdNum}>{fmtInt(w.nb_decroches)}</td>
                  <td style={tdNum}>{fmtInt(w.nb_signes)}</td>
                  <td style={tdNum}>
                    {w.nb_leads > 0 ? fmtPct(w.taux_transfo_pct) : '—'}
                  </td>
                  <td style={tdNum}>
                    {w.nb_decroches > 0 ? fmtPct(w.taux_conversion_pct) : '—'}
                  </td>
                  <td style={{ ...tdNum, fontWeight: 700, color: '#0f172a' }}>
                    {fmtEUR(w.ca)}
                  </td>
                  {!origineActive && (
                    <td style={{ ...tdNum, color: '#94a3b8' }}>{fmtEUR(w.objectif ?? 0)}</td>
                  )}
                  {!origineActive && (
                    <td style={{ ...tdNum, color: pctColor(pct), fontWeight: 700 }}>
                      {fmtPct(pct, 0)}
                    </td>
                  )}
                </tr>
                {isOpen && (
                  <>
                    {loadingDay === w.semaine_debut && days.length === 0 && (
                      <tr style={{ background: '#fafbfc' }}>
                        <td colSpan={origineActive ? 7 : 9} style={{ ...td, color: '#94a3b8', fontStyle: 'italic' }}>
                          Chargement du détail journalier…
                        </td>
                      </tr>
                    )}
                    {days.map((d) => (
                      <tr key={d.jour} style={{ background: '#fafbfc' }}>
                        <td style={{ ...td, paddingLeft: 32, fontSize: 12, color: '#475569' }}>
                          {JOURS_COURT[d.isodow] ?? ''} {fmtDayShort(d.jour)}
                        </td>
                        <td style={tdSubNum}>{fmtInt(d.nb_leads)}</td>
                        <td style={tdSubNum}>{fmtInt(d.nb_decroches)}</td>
                        <td style={tdSubNum}>{fmtInt(d.nb_signes)}</td>
                        <td style={tdSubNum}>
                          {d.nb_leads > 0 ? fmtPct(d.taux_transfo_pct) : '—'}
                        </td>
                        <td style={tdSubNum}>
                          {d.nb_decroches > 0 ? fmtPct(d.taux_conversion_pct) : '—'}
                        </td>
                        <td style={{ ...tdSubNum, color: '#0f172a', fontWeight: 600 }}>
                          {fmtEUR(d.ca)}
                        </td>
                        {!origineActive && (
                          <td style={{ ...tdSubNum, color: '#94a3b8' }}>
                            {d.objectif > 0 ? fmtEUR(d.objectif) : '—'}
                          </td>
                        )}
                        {!origineActive && (
                          <td style={{ ...tdSubNum, color: pctColor(d.pct_obj), fontWeight: 600 }}>
                            {d.pct_obj > 0 ? fmtPct(d.pct_obj, 0) : '—'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </>
                )}
              </Fragment>
            )
          })}
          <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 700 }}>
            <td style={td}>Total mois</td>
            <td style={tdNum}>{fmtInt(totals.leads)}</td>
            <td style={tdNum}>{fmtInt(totals.decroches)}</td>
            <td style={tdNum}>{fmtInt(totals.signes)}</td>
            <td style={{ ...tdNum, color: '#94a3b8' }}>—</td>
            <td style={{ ...tdNum, color: '#94a3b8' }}>—</td>
            <td style={{ ...tdNum, color: '#0f172a' }}>{fmtEUR(totals.ca)}</td>
            {!origineActive && (
              <td style={{ ...tdNum, color: '#64748b' }}>{fmtEUR(totals.obj)}</td>
            )}
            {!origineActive && (
              <td style={tdNum}>
                {totals.obj > 0 ? fmtPct((totals.ca / totals.obj) * 100, 0) : '—'}
              </td>
            )}
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
