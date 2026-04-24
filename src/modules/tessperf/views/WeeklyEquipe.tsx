import { Fragment, useState } from 'react'
import TessPerfLayout from '../components/TessPerfLayout'
import { useWeeklyEquipe } from '../hooks/useWeeklyEquipe'
import { fetchDailyKpisEquipe } from '../api'
import type { DailyKpisEquipe, WeeklyEquipe as WeeklyRow } from '../types'
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

export default function WeeklyEquipe() {
  return (
    <TessPerfLayout section="hebdomadaire" scope="equipe">
      {({ annee, mois }) => <WeeklyContent annee={annee} mois={mois} />}
    </TessPerfLayout>
  )
}

function WeeklyContent({ annee, mois }: { annee: number; mois: number }) {
  const { data, loading, error } = useWeeklyEquipe(annee, mois)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [daily, setDaily] = useState<Record<string, DailyKpisEquipe[]>>({})
  const [loadingDay, setLoadingDay] = useState<string | null>(null)

  async function toggle(w: WeeklyRow) {
    if (expanded === w.semaine_debut) {
      setExpanded(null)
      return
    }
    setExpanded(w.semaine_debut)
    if (!daily[w.semaine_debut]) {
      setLoadingDay(w.semaine_debut)
      try {
        const d = await fetchDailyKpisEquipe(w.semaine_debut, w.semaine_fin)
        setDaily((prev) => ({ ...prev, [w.semaine_debut]: d }))
      } catch {
        /* silent */
      } finally {
        setLoadingDay(null)
      }
    }
  }

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>
  if (data.length === 0) {
    return (
      <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: 32, textAlign: 'center' }}>
        Pas de semaines sur ce mois.
      </div>
    )
  }

  const totals = data.reduce(
    (t, w) => ({
      leads: t.leads + Number(w.nb_leads_equipe_mapapp),
      decroches: t.decroches + Number(w.nb_decroches_productifs),
      signes: t.signes + Number(w.nb_signes_productifs),
      ca: t.ca + Number(w.ca_acquisition_productifs),
      obj: t.obj + Number(w.objectif_ca),
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
            <th style={thR}>Leads Mapapp</th>
            <th style={thR}>Décrochés prod</th>
            <th style={thR}>Signés prod</th>
            <th style={thR}>Tx transfo</th>
            <th style={thR}>Tx conv</th>
            <th style={thR}>CA prod</th>
            <th style={thR}>Obj CA</th>
            <th style={thR}>% obj</th>
          </tr>
        </thead>
        <tbody>
          {data.map((w) => {
            const pct =
              Number(w.objectif_ca) > 0
                ? (Number(w.ca_acquisition_productifs) / Number(w.objectif_ca)) * 100
                : 0
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
                  <td style={tdNum}>{fmtInt(w.nb_leads_equipe_mapapp)}</td>
                  <td style={tdNum}>{fmtInt(w.nb_decroches_productifs)}</td>
                  <td style={tdNum}>{fmtInt(w.nb_signes_productifs)}</td>
                  <td style={tdNum}>{fmtPct(w.taux_transfo_pct)}</td>
                  <td style={tdNum}>{fmtPct(w.taux_conversion_pct)}</td>
                  <td style={{ ...tdNum, fontWeight: 700, color: '#0f172a' }}>
                    {fmtEUR(w.ca_acquisition_productifs)}
                  </td>
                  <td style={{ ...tdNum, color: '#94a3b8' }}>{fmtEUR(w.objectif_ca)}</td>
                  <td style={{ ...tdNum, color: pctColor(pct), fontWeight: 700 }}>
                    {fmtPct(pct, 0)}
                  </td>
                </tr>
                {isOpen && (
                  <>
                    {loadingDay === w.semaine_debut && days.length === 0 && (
                      <tr style={{ background: '#fafbfc' }}>
                        <td colSpan={9} style={{ ...td, color: '#94a3b8', fontStyle: 'italic' }}>
                          Chargement du détail journalier…
                        </td>
                      </tr>
                    )}
                    {days.map((d) => {
                      const leadsOk = Number(d.nb_leads_mapapp) > 0
                      const decOk = Number(d.nb_decroches_productifs_mapapp) > 0
                      const dPct = Number(d.pct_objectif_jour)
                      return (
                        <tr key={d.jour} style={{ background: '#fafbfc' }}>
                          <td style={{ ...td, paddingLeft: 32, fontSize: 12, color: '#475569' }}>
                            {JOURS_COURT[d.isodow] ?? d.jour_nom} {fmtDayShort(d.jour)}
                          </td>
                          <td style={tdSubNum}>{fmtInt(d.nb_leads_mapapp)}</td>
                          <td style={tdSubNum}>{fmtInt(d.nb_decroches_productifs_mapapp)}</td>
                          <td style={tdSubNum}>{fmtInt(d.nb_signes_productifs)}</td>
                          <td style={tdSubNum}>
                            {leadsOk ? fmtPct(d.taux_transfo_pct) : '—'}
                          </td>
                          <td style={tdSubNum}>
                            {decOk ? fmtPct(d.taux_conversion_pct) : '—'}
                          </td>
                          <td style={{ ...tdSubNum, color: '#0f172a', fontWeight: 600 }}>
                            {fmtEUR(d.ca_acquisition_productifs)}
                          </td>
                          <td style={{ ...tdSubNum, color: '#94a3b8' }}>
                            {Number(d.objectif_ca_jour) > 0 ? fmtEUR(d.objectif_ca_jour) : '—'}
                          </td>
                          <td style={{ ...tdSubNum, color: pctColor(dPct), fontWeight: 600 }}>
                            {dPct > 0 ? fmtPct(dPct, 0) : '—'}
                          </td>
                        </tr>
                      )
                    })}
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
            <td style={{ ...tdNum, color: '#64748b' }}>{fmtEUR(totals.obj)}</td>
            <td style={tdNum}>
              {totals.obj > 0 ? fmtPct((totals.ca / totals.obj) * 100, 0) : '—'}
            </td>
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
