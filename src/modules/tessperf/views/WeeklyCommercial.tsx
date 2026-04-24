import { Fragment, useEffect, useMemo, useState } from 'react'
import TessPerfLayout from '../components/TessPerfLayout'
import { useWeeklyDataCommercial } from '../hooks/useWeeklyData'
import { fetchDailyKpisCommercial } from '../api'
import type { DailyKpisCommercial, WeeklyKpis } from '../types'
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

export default function WeeklyCommercial() {
  return (
    <TessPerfLayout section="hebdomadaire" scope="commercial">
      {({ annee, mois, activeCommercialId }) =>
        activeCommercialId ? (
          <WeeklyContent id={activeCommercialId} annee={annee} mois={mois} />
        ) : null
      }
    </TessPerfLayout>
  )
}

function WeeklyContent({
  id,
  annee,
  mois,
}: {
  id: string
  annee: number
  mois: number
}) {
  const { debut, fin } = useMemo(() => monthRange(annee, mois), [annee, mois])
  const { data, loading, error } = useWeeklyDataCommercial(id, debut, fin)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [daily, setDaily] = useState<Record<string, DailyKpisCommercial[]>>({})
  const [loadingDay, setLoadingDay] = useState<string | null>(null)

  // Reset l'état de drill-down quand on change de commercial (scope).
  useEffect(() => {
    setExpanded(null)
    setDaily({})
  }, [id])

  async function toggle(w: WeeklyKpis) {
    if (expanded === w.semaine_debut) {
      setExpanded(null)
      return
    }
    setExpanded(w.semaine_debut)
    if (!daily[w.semaine_debut]) {
      setLoadingDay(w.semaine_debut)
      try {
        const d = await fetchDailyKpisCommercial(id, w.semaine_debut, w.semaine_fin)
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
      dec: t.dec + Number(w.nb_decroches),
      sig: t.sig + Number(w.nb_contrats_signes),
      ca: t.ca + Number(w.ca_acquisition),
      mut: t.mut + Number(w.nb_mutuelles),
      me: t.me + Number(w.nb_multi_equip),
      fr: t.fr + Number(w.nb_frais_service),
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
            <th style={thR}>Multi-éq</th>
            <th style={thR}>Frais serv.</th>
          </tr>
        </thead>
        <tbody>
          {data.map((w) => {
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
                  <td style={tdNum}>{fmtInt(w.nb_contrats_signes)}</td>
                  <td style={tdNum}>{fmtPct(w.taux_conversion_pct)}</td>
                  <td style={{ ...tdNum, fontWeight: 700, color: '#0f172a' }}>
                    {fmtEUR(w.ca_acquisition)}
                  </td>
                  <td style={tdNum}>{fmtInt(w.nb_mutuelles)}</td>
                  <td style={tdNum}>{fmtInt(w.nb_multi_equip)}</td>
                  <td style={tdNum}>{fmtInt(w.nb_frais_service)}</td>
                </tr>
                {isOpen && (
                  <>
                    {loadingDay === w.semaine_debut && days.length === 0 && (
                      <tr style={{ background: '#fafbfc' }}>
                        <td colSpan={8} style={{ ...td, color: '#94a3b8', fontStyle: 'italic' }}>
                          Chargement du détail journalier…
                        </td>
                      </tr>
                    )}
                    {days.map((d) => {
                      const decOk = Number(d.nb_decroches_mapapp) > 0
                      return (
                        <tr key={d.jour} style={{ background: '#fafbfc' }}>
                          <td style={{ ...td, paddingLeft: 32, fontSize: 12, color: '#475569' }}>
                            {JOURS_COURT[d.isodow] ?? d.jour_nom} {fmtDayShort(d.jour)}
                          </td>
                          <td style={tdSubNum}>{fmtInt(d.nb_decroches_mapapp)}</td>
                          <td style={tdSubNum}>{fmtInt(d.nb_signes_productifs)}</td>
                          <td style={tdSubNum}>
                            {decOk ? fmtPct(d.taux_conversion_pct) : '—'}
                          </td>
                          <td style={{ ...tdSubNum, color: '#0f172a', fontWeight: 600 }}>
                            {fmtEUR(d.ca_acquisition)}
                          </td>
                          <td style={tdSubNum}>{fmtInt(d.nb_signes_mutuelle)}</td>
                          <td style={tdSubNum}>{fmtInt(d.nb_signes_multi_equip)}</td>
                          <td style={tdSubNum}>{fmtInt(d.nb_frais_service)}</td>
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
            <td style={tdNum}>{fmtInt(totals.dec)}</td>
            <td style={tdNum}>{fmtInt(totals.sig)}</td>
            <td style={{ ...tdNum, color: '#94a3b8' }}>—</td>
            <td style={{ ...tdNum, color: '#0f172a' }}>{fmtEUR(totals.ca)}</td>
            <td style={tdNum}>{fmtInt(totals.mut)}</td>
            <td style={tdNum}>{fmtInt(totals.me)}</td>
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
