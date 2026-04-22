import { useMemo, useState } from 'react'
import { Modal } from '@/shared/ui'
import { useDailyDrilldown } from '../hooks/useDailyDrilldown'
import {
  fmtEUR,
  fmtInt,
  fmtJourLong,
  fmtPct,
} from '../utils/format'
import type { ContratsDaily, LeadsDaily } from '../types'

interface WeekDrilldownProps {
  commercialId: string | null
  semaineDebut: string // ISO date (lundi)
  precSemaineDebut?: string // ISO date (lundi N-1) pour calcul tendance
}

const JOURS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

interface DayBucket {
  jour: string
  nb_decroches: number
  nb_signes: number
  ca: number
  hasData: boolean
}

function bucketByDay(
  semaineDebut: string,
  contrats: ContratsDaily[],
  leads: LeadsDaily[],
): DayBucket[] {
  const today = new Date().toISOString().slice(0, 10)
  return Array.from({ length: 7 }, (_, i) => {
    const jour = addDays(semaineDebut, i)
    const dayContrats = contrats.filter((c) => c.jour === jour)
    const dayLeads = leads.filter((l) => l.jour === jour)
    const decroches = dayLeads.reduce((s, l) => s + Number(l.nb_decroches ?? 0), 0)
    const signes = dayContrats.reduce((s, c) => s + Number(c.nb_contrats ?? 0), 0)
    const ca = dayContrats.reduce((s, c) => s + Number(c.ca_acquisition_societe ?? 0), 0)
    return {
      jour,
      nb_decroches: decroches,
      nb_signes: signes,
      ca,
      hasData: jour <= today,
    }
  })
}

export function WeekDrilldown({
  commercialId,
  semaineDebut,
  precSemaineDebut,
}: WeekDrilldownProps) {
  const semaineFin = useMemo(() => addDays(semaineDebut, 6), [semaineDebut])
  const { contrats, leads, loading, error } = useDailyDrilldown(
    commercialId,
    semaineDebut,
    semaineFin,
  )

  const [openJour, setOpenJour] = useState<string | null>(null)

  const days = useMemo(
    () => bucketByDay(semaineDebut, contrats, leads),
    [semaineDebut, contrats, leads],
  )

  const totalDecroches = days.reduce((s, d) => s + d.nb_decroches, 0)
  const totalSignes = days.reduce((s, d) => s + d.nb_signes, 0)
  const totalCA = days.reduce((s, d) => s + d.ca, 0)

  // Tendance vs semaine précédente
  const precFin = precSemaineDebut ? addDays(precSemaineDebut, 6) : ''
  const { contrats: precContrats, leads: precLeads } = useDailyDrilldown(
    commercialId,
    precSemaineDebut ?? semaineDebut,
    precSemaineDebut ? precFin : semaineDebut,
  )
  const precDays = useMemo(
    () =>
      precSemaineDebut
        ? bucketByDay(precSemaineDebut, precContrats, precLeads)
        : [],
    [precSemaineDebut, precContrats, precLeads],
  )
  const precTotalDecroches = precDays.reduce((s, d) => s + d.nb_decroches, 0)
  const precTotalSignes = precDays.reduce((s, d) => s + d.nb_signes, 0)
  const precTotalCA = precDays.reduce((s, d) => s + d.ca, 0)

  const trendPct = (now: number, prev: number): string => {
    if (prev <= 0) return now > 0 ? '+ ∞' : '—'
    const pct = ((now - prev) / prev) * 100
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(0)} %`
  }

  const debutLabel = new Date(semaineDebut).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })
  const finLabel = new Date(semaineFin).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Semaine en cours
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
          Du {debutLabel} au {finLabel}
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#64748b', fontSize: 13 }}>Chargement…</div>
      ) : error ? (
        <div style={{ color: '#dc2626', fontSize: 13 }}>Erreur : {error}</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {JOURS_LABELS.map((j, i) => (
                    <th key={j} style={{ padding: '6px 4px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>
                      {j}{' '}
                      <span style={{ color: '#cbd5e1', fontWeight: 400 }}>
                        {new Date(addDays(semaineDebut, i)).getDate()}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <DayRow days={days} field="nb_decroches" label="Décrochés" onClick={setOpenJour} />
                <DayRow days={days} field="nb_signes" label="Signés" onClick={setOpenJour} />
                <DayRow days={days} field="ca" label="CA" formatter={fmtEUR} onClick={setOpenJour} />
              </tbody>
            </table>
          </div>

          <div
            style={{
              fontSize: 12,
              color: '#475569',
              padding: '10px 12px',
              background: '#f8fafc',
              borderRadius: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div>
              <strong>Total semaine : </strong>
              {fmtInt(totalDecroches)} décrochés · {fmtInt(totalSignes)} signés · {fmtEUR(totalCA)}
            </div>
            {precSemaineDebut && (
              <div style={{ color: '#94a3b8', fontSize: 11 }}>
                Tendance vs S-1 : {trendPct(totalDecroches, precTotalDecroches)} décrochés ·{' '}
                {trendPct(totalSignes, precTotalSignes)} signés ·{' '}
                {trendPct(totalCA, precTotalCA)} CA
              </div>
            )}
          </div>
        </>
      )}

      <Modal open={openJour !== null} onClose={() => setOpenJour(null)} title={openJour ? fmtJourLong(openJour) : ''}>
        {openJour && (
          <DayDetail
            jour={openJour}
            contrats={contrats.filter((c) => c.jour === openJour)}
            leads={leads.filter((l) => l.jour === openJour)}
          />
        )}
      </Modal>
    </div>
  )
}

function DayRow({
  days,
  field,
  label,
  formatter = fmtInt,
  onClick,
}: {
  days: DayBucket[]
  field: 'nb_decroches' | 'nb_signes' | 'ca'
  label: string
  formatter?: (n: number) => string
  onClick: (jour: string) => void
}) {
  return (
    <tr style={{ borderTop: '1px solid #f1f5f9' }}>
      {days.map((d) => {
        const v = d[field]
        return (
          <td
            key={d.jour}
            onClick={() => d.hasData && onClick(d.jour)}
            style={{
              padding: '10px 4px',
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              color: d.hasData ? (v > 0 ? '#0f172a' : '#cbd5e1') : '#e2e8f0',
              fontWeight: v > 0 ? 600 : 400,
              cursor: d.hasData && v > 0 ? 'pointer' : 'default',
              fontSize: field === 'ca' ? 11 : 13,
            }}
            title={d.hasData ? `${label} — clic pour détail` : 'À venir'}
          >
            {d.hasData ? (v > 0 ? formatter(v) : '—') : '—'}
          </td>
        )
      })}
    </tr>
  )
}

function DayDetail({
  jour: _jour,
  contrats,
  leads,
}: {
  jour: string
  contrats: ContratsDaily[]
  leads: LeadsDaily[]
}) {
  const totalContrats = contrats.reduce((s, c) => s + Number(c.nb_contrats ?? 0), 0)
  const totalCA = contrats.reduce((s, c) => s + Number(c.ca_acquisition_societe ?? 0), 0)
  const totalDecroches = leads.reduce((s, l) => s + Number(l.nb_decroches ?? 0), 0)
  const totalLeads = leads.reduce((s, l) => s + Number(l.nb_leads ?? 0), 0)
  const tauxDecroche = totalLeads > 0 ? (totalDecroches / totalLeads) * 100 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Stat label="Leads" value={fmtInt(totalLeads)} />
        <Stat label="Décrochés" value={fmtInt(totalDecroches)} sub={`${fmtPct(tauxDecroche)}`} />
        <Stat label="Contrats signés" value={fmtInt(totalContrats)} />
        <Stat label="CA acquisition" value={fmtEUR(totalCA)} />
      </div>

      {contrats.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
            Contrats
          </div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#94a3b8', fontSize: 10 }}>
                <th style={{ padding: 4, textAlign: 'left' }}>Source</th>
                <th style={{ padding: 4, textAlign: 'left' }}>Produit</th>
                <th style={{ padding: 4, textAlign: 'right' }}>Nb</th>
                <th style={{ padding: 4, textAlign: 'right' }}>CA acquis.</th>
                <th style={{ padding: 4, textAlign: 'right' }}>Frais</th>
              </tr>
            </thead>
            <tbody>
              {contrats.map((c, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: 6 }}>{c.source}</td>
                  <td style={{ padding: 6 }}>{c.type_produit}</td>
                  <td style={{ padding: 6, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmtInt(Number(c.nb_contrats))}
                  </td>
                  <td style={{ padding: 6, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
                    {fmtEUR(Number(c.ca_acquisition_societe))}
                  </td>
                  <td style={{ padding: 6, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: '#94a3b8' }}>
                    {fmtEUR(Number(c.frais_service_total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {contrats.length === 0 && (
        <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>
          Aucun contrat signé ce jour.
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#64748b' }}>{sub}</div>}
    </div>
  )
}
