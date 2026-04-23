import { useMemo, useState } from 'react'
import { Modal } from '@/shared/ui'
import { useWeeklyEquipe } from '../hooks/useWeeklyEquipe'
import { useDailyDrilldown } from '../hooks/useDailyDrilldown'
import TessPerfLayout from '../components/TessPerfLayout'
import { fmtEUR, fmtInt, fmtJourLong, fmtPct } from '../utils/format'
import type { WeeklyEquipe as WeeklyRow } from '../types'

export default function WeeklyEquipe() {
  return (
    <TessPerfLayout section="hebdomadaire" scope="equipe">
      {({ annee, mois }) => <WeeklyContent annee={annee} mois={mois} />}
    </TessPerfLayout>
  )
}

function fmtWeekLabel(ws: string, wf: string): string {
  const d = (iso: string) => {
    const dt = new Date(iso)
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`
  }
  return `${d(ws)} → ${d(wf)}`
}

function feuFrom(realise: number, cible: number): { fg: string } {
  const r = cible > 0 ? realise / cible : 0
  if (r >= 0.85) return { fg: '#047857' }
  if (r >= 0.5) return { fg: '#b45309' }
  return { fg: '#b91c1c' }
}

function WeeklyContent({ annee, mois }: { annee: number; mois: number }) {
  const { data, loading, error } = useWeeklyEquipe(annee, mois)
  const [selectedWeek, setSelectedWeek] = useState<WeeklyRow | null>(null)

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
            const { fg } = feuFrom(pct, 100)
            return (
              <tr
                key={w.semaine_debut}
                onClick={() => setSelectedWeek(w)}
                style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}
              >
                <td style={{ ...td, fontWeight: 500 }}>
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
                <td style={{ ...tdNum, color: fg, fontWeight: 700 }}>
                  {fmtPct(pct, 0)}
                </td>
              </tr>
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

      <Modal
        open={!!selectedWeek}
        onClose={() => setSelectedWeek(null)}
        title={selectedWeek ? `Semaine ${fmtWeekLabel(selectedWeek.semaine_debut, selectedWeek.semaine_fin)}` : ''}
      >
        {selectedWeek && <WeekDayDetail week={selectedWeek} />}
      </Modal>
    </div>
  )
}

function WeekDayDetail({ week }: { week: WeeklyRow }) {
  const { contrats, leads, loading, error } = useDailyDrilldown(
    null,
    week.semaine_debut,
    week.semaine_fin,
  )
  const days = useMemo(() => {
    const out: { jour: string; decroches: number; signes: number; ca: number }[] = []
    const start = new Date(week.semaine_debut)
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const iso = d.toISOString().slice(0, 10)
      const decroches = leads
        .filter((l) => l.jour === iso)
        .reduce((s, l) => s + Number(l.nb_decroches ?? 0), 0)
      const signes = contrats
        .filter((c) => c.jour === iso)
        .reduce((s, c) => s + Number(c.nb_contrats ?? 0), 0)
      const ca = contrats
        .filter((c) => c.jour === iso)
        .reduce((s, c) => s + Number(c.ca_acquisition_societe ?? 0), 0)
      out.push({ jour: iso, decroches, signes, ca })
    }
    return out
  }, [contrats, leads, week.semaine_debut])

  if (loading) return <div style={{ color: '#64748b', padding: 12 }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626', padding: 12 }}>Erreur : {error}</div>

  return (
    <div style={{ fontSize: 13 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#94a3b8', fontSize: 11 }}>
            <th style={{ ...subTh, textAlign: 'left' }}>Jour</th>
            <th style={{ ...subTh, textAlign: 'right' }}>Décrochés</th>
            <th style={{ ...subTh, textAlign: 'right' }}>Signés</th>
            <th style={{ ...subTh, textAlign: 'right' }}>CA acquis.</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.jour} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={subTd}>{fmtJourLong(d.jour)}</td>
              <td style={{ ...subTd, textAlign: 'right', fontFamily: MONO }}>
                {d.decroches > 0 ? fmtInt(d.decroches) : '—'}
              </td>
              <td style={{ ...subTd, textAlign: 'right', fontFamily: MONO }}>
                {d.signes > 0 ? fmtInt(d.signes) : '—'}
              </td>
              <td style={{ ...subTd, textAlign: 'right', fontFamily: MONO, color: '#0f172a', fontWeight: 600 }}>
                {d.ca > 0 ? fmtEUR(d.ca) : '—'}
              </td>
            </tr>
          ))}
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
const subTh: React.CSSProperties = {
  padding: '6px 8px', borderBottom: '1px solid #e5e7eb',
}
const subTd: React.CSSProperties = { padding: '8px' }
