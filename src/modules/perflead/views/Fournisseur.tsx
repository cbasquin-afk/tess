import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, parseISO, startOfISOWeek } from 'date-fns'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from 'chart.js'
import { Chart } from 'react-chartjs-2'
import { supabase } from '@/shared/supabase'
import { useStats } from '../hooks/useStats'
import type { CallbackSummary, Lead } from '../types'

ChartJS.register(
  LineController,
  LineElement,
  PointElement,
  Filler,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
)

const NRP_STATUTS = new Set([
  'Ne répond pas',
  'Lead de plus de 30 jours',
  'Raccroche au nez',
])
const INEXPLOITABLE_STATUTS = new Set([
  'Inexploitable (Faux numéro)',
  'Inexploitable (Numéro non attribué)',
])

const CAT_COLORS: Record<string, string> = {
  Contrat: '#1D9E75',
  'En cours': '#378ADD',
  NRP: '#BA7517',
  Perdu: '#A32D2D',
  Inexploitable: '#888780',
  Rétracté: '#5F5E5A',
}

const SERIES_COLORS = {
  total: '#94a3b8',
  contrats: '#1D9E75',
  enCours: '#378ADD',
  nrp: '#BA7517',
  perdu: '#E24B4A',
  inexploitable: '#888780',
} as const

const MAX_WEEKS = 13
const MAX_TABLE_ROWS = 500

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return iso
  }
}

function isLeadByteFournisseur(l: Lead): boolean {
  // Fidèle à render-fournisseur.js : leads MapApp Digital avec leadbyte_id
  if (!l.leadbyte_id) return false
  return l.origine === 'MapApp Digital' || !l.origine
}

// ── Helpers export ──────────────────────────────────────────
const EXPORT_HEADERS = [
  'ID Leadbyte',
  'Statut',
  'Catégorie',
  'Commercial',
  'Tranche',
  'Date création',
] as const

function leadToRow(l: Lead): string[] {
  return [
    l.leadbyte_id ?? '',
    l.statut ?? '',
    l.categorie ?? '',
    (l.attribution ?? '').split(' ')[0] ?? '',
    l.tranche_age ?? '',
    l.date_creation?.slice(0, 10) ?? '',
  ]
}

function escapeCsv(v: string): string {
  return v.includes(',') || v.includes('"') || v.includes('\n')
    ? `"${v.replace(/"/g, '""')}"`
    : v
}

function exportCSV(rows: Lead[], filename: string): void {
  const lines = [
    EXPORT_HEADERS.join(','),
    ...rows.map((l) => leadToRow(l).map(escapeCsv).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function copyTSV(rows: Lead[]): Promise<void> {
  const lines = [
    EXPORT_HEADERS.join('\t'),
    ...rows.map((l) => leadToRow(l).join('\t')),
  ]
  await navigator.clipboard.writeText(lines.join('\n'))
}

// ── Composant principal ─────────────────────────────────────
function Fournisseur() {
  const { leads, contrats, loading, error } = useStats()

  const fournLeads = useMemo(
    () => leads.filter(isLeadByteFournisseur),
    [leads],
  )

  const kpis = useMemo(() => {
    const nbT = fournLeads.length
    const nbC = fournLeads.filter((l) => l.categorie === 'Contrat').length
    const nbEC = fournLeads.filter((l) => l.categorie === 'En cours').length
    const nbNRP = fournLeads.filter((l) => NRP_STATUTS.has(l.statut)).length
    const nbInex = fournLeads.filter((l) =>
      INEXPLOITABLE_STATUTS.has(l.statut),
    ).length

    const contratsIds = new Set(
      fournLeads
        .filter((l) => l.categorie === 'Contrat')
        .map((l) => l.identifiant_projet),
    )
    const pmVals = contrats
      .filter(
        (c) =>
          contratsIds.has(c.identifiant_projet) &&
          c.prime_brute_mensuelle &&
          c.prime_brute_mensuelle > 0,
      )
      .map((c) => c.prime_brute_mensuelle ?? 0)

    const pmMoyen = pmVals.length
      ? pmVals.reduce((a, b) => a + b, 0) / pmVals.length
      : 0

    return {
      nbT,
      nbC,
      nbEC,
      nbNRP,
      nbInex,
      pmMoyen,
      txConv: nbT > 0 ? (nbC / nbT) * 100 : 0,
      pctEC: nbT > 0 ? (nbEC / nbT) * 100 : 0,
      pctNRP: nbT > 0 ? (nbNRP / nbT) * 100 : 0,
      pctInex: nbT > 0 ? (nbInex / nbT) * 100 : 0,
    }
  }, [fournLeads, contrats])

  // ── Chart hebdo : 6 séries sur les 13 dernières semaines ──
  const weeklyData = useMemo(() => {
    interface Bucket {
      weekKey: string
      weekDate: Date
      total: number
      contrats: number
      enCours: number
      nrp: number
      perdu: number
      inexploitable: number
    }
    const byWeek = new Map<string, Bucket>()

    for (const l of fournLeads) {
      if (!l.date_creation) continue
      let monday: Date
      try {
        monday = startOfISOWeek(parseISO(l.date_creation.slice(0, 10)))
      } catch {
        continue
      }
      const weekKey = format(monday, 'yyyy-MM-dd')
      let b = byWeek.get(weekKey)
      if (!b) {
        b = {
          weekKey,
          weekDate: monday,
          total: 0,
          contrats: 0,
          enCours: 0,
          nrp: 0,
          perdu: 0,
          inexploitable: 0,
        }
        byWeek.set(weekKey, b)
      }
      b.total += 1
      // Ordre fidèle au natif : Contrat / En cours / NRP / Perdu / Inexpl.
      if (l.categorie === 'Contrat') b.contrats += 1
      else if (l.categorie === 'En cours') b.enCours += 1
      else if (NRP_STATUTS.has(l.statut)) b.nrp += 1
      else if (l.categorie === 'Perdu') b.perdu += 1
      else if (INEXPLOITABLE_STATUTS.has(l.statut)) b.inexploitable += 1
    }

    return Array.from(byWeek.values())
      .sort((a, b) => a.weekDate.getTime() - b.weekDate.getTime())
      .slice(-MAX_WEEKS)
  }, [fournLeads])

  const chartData = useMemo<ChartData<'line'>>(
    () => ({
      labels: weeklyData.map((w) => format(w.weekDate, 'dd/MM')),
      datasets: [
        {
          label: 'Total',
          data: weeklyData.map((w) => w.total),
          borderColor: SERIES_COLORS.total,
          backgroundColor: 'rgba(148, 163, 184, 0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          borderWidth: 2,
        },
        {
          label: 'Contrats',
          data: weeklyData.map((w) => w.contrats),
          borderColor: SERIES_COLORS.contrats,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 4,
          borderWidth: 2,
        },
        {
          label: 'En cours',
          data: weeklyData.map((w) => w.enCours),
          borderColor: SERIES_COLORS.enCours,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 2,
        },
        {
          label: 'NRP',
          data: weeklyData.map((w) => w.nrp),
          borderColor: SERIES_COLORS.nrp,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 1.5,
          borderDash: [4, 3],
        },
        {
          label: 'Perdu',
          data: weeklyData.map((w) => w.perdu),
          borderColor: SERIES_COLORS.perdu,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 1.5,
          borderDash: [4, 3],
        },
        {
          label: 'Inexploitable',
          data: weeklyData.map((w) => w.inexploitable),
          borderColor: SERIES_COLORS.inexploitable,
          backgroundColor: 'transparent',
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 1.5,
          borderDash: [2, 4],
        },
      ],
    }),
    [weeklyData],
  )

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { beginAtZero: true },
      x: { grid: { display: false } },
    },
    plugins: { legend: { position: 'bottom' } },
  }

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  const visibleRows = fournLeads.slice(0, MAX_TABLE_ROWS)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Fournisseur</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Performances des leads MapApp Digital / LeadByte.
        </p>
      </div>

      {/* 6 KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 14,
        }}
      >
        <Kpi label="Leads fournisseur" value={fmt(kpis.nbT)} />
        <Kpi
          label="Tx conversion"
          value={kpis.nbT > 0 ? `${kpis.txConv.toFixed(1)}%` : '—'}
          color={kpis.txConv >= 12 ? '#1D9E75' : '#E24B4A'}
        />
        <Kpi
          label="En cours"
          value={
            kpis.nbT > 0
              ? `${fmt(kpis.nbEC)} (${kpis.pctEC.toFixed(1)}%)`
              : '—'
          }
          color="#378ADD"
        />
        <Kpi
          label="NRP"
          value={
            kpis.nbT > 0
              ? `${fmt(kpis.nbNRP)} (${kpis.pctNRP.toFixed(1)}%)`
              : '—'
          }
          color="#BA7517"
        />
        <Kpi
          label="Inexploitable"
          value={
            kpis.nbT > 0
              ? `${fmt(kpis.nbInex)} (${kpis.pctInex.toFixed(1)}%)`
              : '—'
          }
          color="#888780"
        />
        <Kpi
          label="PM moyen"
          value={kpis.pmMoyen > 0 ? `${kpis.pmMoyen.toFixed(0)}€` : '—'}
          color={kpis.pmMoyen >= 100 ? '#1D9E75' : '#E24B4A'}
        />
      </div>

      {/* Chart hebdo */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>
            Évolution hebdomadaire — leads fournisseur
          </h3>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            13 dernières semaines avec leads · 6 séries (total + 5 catégories)
          </div>
        </div>
        <div style={{ height: 260 }}>
          {weeklyData.length > 0 ? (
            <Chart type="line" data={chartData} options={chartOptions} />
          ) : (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>
              Aucune donnée hebdo à afficher.
            </div>
          )}
        </div>
      </div>

      {/* Tableau leads */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 14 }}>Leads fournisseur</h3>
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              {fmt(fournLeads.length)} leads · {MAX_TABLE_ROWS} max affichés
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                void copyTSV(visibleRows)
              }}
              disabled={visibleRows.length === 0}
              style={btnStyle}
            >
              📋 Copier TSV
            </button>
            <button
              type="button"
              onClick={() =>
                exportCSV(visibleRows, 'leads-fournisseur.csv')
              }
              disabled={visibleRows.length === 0}
              style={btnPrimaryStyle}
            >
              ⬇ Export CSV
            </button>
          </div>
        </div>
        {fournLeads.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 13 }}>
            Aucun lead fournisseur sur la période sélectionnée.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
            >
              <thead>
                <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
                  <th style={th}>LeadByte ID</th>
                  <th style={th}>Statut</th>
                  <th style={th}>Catégorie</th>
                  <th style={th}>Commercial</th>
                  <th style={th}>Tranche</th>
                  <th style={th}>Date création</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((l) => (
                  <tr
                    key={l.id ?? l.leadbyte_id ?? Math.random()}
                    style={{ borderTop: '1px solid #f1f5f9' }}
                  >
                    <td style={{ ...td, fontWeight: 500, color: '#0f172a' }}>
                      {l.leadbyte_id}
                    </td>
                    <td style={{ ...td, color: '#475569' }}>{l.statut}</td>
                    <td style={td}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: CAT_COLORS[l.categorie] ?? '#888780',
                        }}
                      >
                        {l.categorie}
                      </span>
                    </td>
                    <td style={{ ...td, color: '#64748b' }}>
                      {(l.attribution ?? '').split(' ')[0]}
                    </td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {l.tranche_age ?? '—'}
                    </td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {fmtDate(l.date_creation)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section dédiée envoi statuts vers Mapapp (60 derniers jours) */}
      <MapappCallbackSection />
    </div>
  )
}

// ═══════════ Section Mapapp Callback (60 derniers jours) ═══════════

interface MapappLead {
  identifiant_projet: number
  leadbyte_id: string | null
  email: string | null
  statut: string | null
  date_creation: string | null
  prenom: string | null
  nom: string | null
}

function MapappCallbackSection() {
  const [leads, setLeads] = useState<MapappLead[]>([])
  const [mapping, setMapping] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 60)
    const cutoffStr = cutoff.toISOString().split('T')[0]

    Promise.all([
      supabase
        .from('perflead_leads')
        .select(
          'identifiant_projet, leadbyte_id, email, statut, date_creation, prenom, nom',
        )
        .eq('origine', 'MapApp Digital')
        .gte('date_creation', cutoffStr)
        .order('date_creation', { ascending: false }),
      supabase
        .from('callback_statut_map')
        .select('statut_interne, statut_mapapp, actif')
        .eq('actif', true),
    ])
      .then(([rLeads, rMap]) => {
        if (cancelled) return
        if (rLeads.error) throw new Error(`leads: ${rLeads.error.message}`)
        if (rMap.error) throw new Error(`mapping: ${rMap.error.message}`)
        setLeads((rLeads.data ?? []) as MapappLead[])
        const m = new Map<string, string>()
        for (const row of (rMap.data ?? []) as {
          statut_interne: string
          statut_mapapp: string
        }[]) {
          m.set(row.statut_interne, row.statut_mapapp)
        }
        setMapping(m)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Clé de sélection : leadbyte_id si dispo, sinon identifiant_projet en string
  const rowKey = useCallback((l: MapappLead): string => {
    return l.leadbyte_id ?? String(l.identifiant_projet)
  }, [])

  const sendableKeys = useMemo(
    () =>
      leads
        .filter((l) => l.leadbyte_id != null || l.identifiant_projet != null)
        .map(rowKey),
    [leads, rowKey],
  )

  const allSelected =
    sendableKeys.length > 0 && sendableKeys.every((k) => selected.has(k))

  const toggleOne = useCallback((k: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (sendableKeys.every((k) => prev.has(k))) return new Set()
      return new Set(sendableKeys)
    })
  }, [sendableKeys])

  const handleSend = useCallback(async () => {
    if (selected.size === 0) return
    setSending(true)
    try {
      const { data, error: err } =
        await supabase.functions.invoke<CallbackSummary>(
          'perflead-callback-send',
          { body: { lead_ids: Array.from(selected) } },
        )
      if (err) throw new Error(err.message)
      const summary = data ?? { sent: 0, skipped: 0, errors: 0, details: [] }
      const parts = [
        `${summary.sent} envoyé(s)`,
        summary.skipped > 0 ? `${summary.skipped} ignoré(s)` : null,
        summary.errors > 0 ? `${summary.errors} erreur(s)` : null,
      ].filter(Boolean)
      setToast(parts.join(' · '))
      setSelected(new Set())
    } catch (e: unknown) {
      setToast(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSending(false)
    }
  }, [selected])

  const fullName = (l: MapappLead): string => {
    const n = [l.prenom, l.nom].filter(Boolean).join(' ').trim()
    return n || '—'
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 14 }}>
            Envoi statuts → Mapapp Digital
          </h3>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            Leads MapApp Digital des 60 derniers jours · sélectionner pour
            notifier le webhook n8n.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {fmt(leads.length)} leads · {selected.size} sélectionné(s)
          </span>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={selected.size === 0 || sending}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              borderRadius: 6,
              cursor:
                selected.size === 0 || sending ? 'not-allowed' : 'pointer',
              background:
                selected.size === 0 || sending ? '#e5e7eb' : '#1f3a8a',
              color: selected.size === 0 || sending ? '#9ca3af' : '#fff',
            }}
          >
            {sending
              ? 'Envoi…'
              : `Envoyer statuts Mapapp${selected.size > 0 ? ` (${selected.size})` : ''}`}
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ color: '#64748b', fontSize: 13 }}>Chargement…</div>
      )}
      {error && (
        <div style={{ color: '#dc2626', fontSize: 13 }}>Erreur : {error}</div>
      )}

      {!loading && !error && leads.length === 0 && (
        <div style={{ color: '#94a3b8', fontSize: 13 }}>
          Aucun lead MapApp Digital sur les 60 derniers jours.
        </div>
      )}

      {!loading && !error && leads.length > 0 && (
        <div style={{ overflowX: 'auto', maxHeight: 520, overflowY: 'auto' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}
          >
            <thead>
              <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
                <th style={{ ...th, width: 32, background: '#f8fafc', position: 'sticky', top: 0 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={sendableKeys.length === 0}
                    title="Tout (dé)sélectionner"
                  />
                </th>
                <th style={{ ...th, background: '#f8fafc', position: 'sticky', top: 0 }}>Date</th>
                <th style={{ ...th, background: '#f8fafc', position: 'sticky', top: 0 }}>Nom</th>
                <th style={{ ...th, background: '#f8fafc', position: 'sticky', top: 0 }}>Statut</th>
                <th style={{ ...th, background: '#f8fafc', position: 'sticky', top: 0 }}>Statut Mapapp</th>
                <th style={{ ...th, background: '#f8fafc', position: 'sticky', top: 0 }}>Leadbyte ID</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const k = rowKey(l)
                const isSel = selected.has(k)
                const hasKey =
                  l.leadbyte_id != null || l.identifiant_projet != null
                const statutMapapp = l.statut ? (mapping.get(l.statut) ?? null) : null
                return (
                  <tr
                    key={k}
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      background: isSel ? 'rgba(31,58,138,0.05)' : undefined,
                    }}
                  >
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={isSel}
                        disabled={!hasKey}
                        onChange={() => hasKey && toggleOne(k)}
                      />
                    </td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {fmtDate(l.date_creation)}
                    </td>
                    <td style={{ ...td, color: '#0f172a' }}>{fullName(l)}</td>
                    <td style={{ ...td, color: '#475569' }}>{l.statut ?? '—'}</td>
                    <td style={td}>
                      {statutMapapp ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: '#dbeafe',
                            color: '#1e40af',
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: 'JetBrains Mono, monospace',
                          }}
                        >
                          {statutMapapp}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        ...td,
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 12,
                        color: l.leadbyte_id ? '#0f172a' : '#cbd5e1',
                      }}
                    >
                      {l.leadbyte_id ?? '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            padding: '10px 16px',
            background: toast.startsWith('Erreur') ? '#ef4444' : '#1f3a8a',
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }

const btnStyle: React.CSSProperties = {
  background: '#f3f4f6',
  border: '1px solid #d1d5db',
  color: '#374151',
  borderRadius: 6,
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnPrimaryStyle: React.CSSProperties = {
  background: '#1f3a8a',
  border: '1px solid #1f3a8a',
  color: '#fff',
  borderRadius: 6,
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

interface KpiProps {
  label: string
  value: string
  color?: string
}
function Kpi({ label, value, color }: KpiProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: '6px 0 2px',
          color: color ?? '#0f172a',
        }}
      >
        {value}
      </div>
    </div>
  )
}

export default Fournisseur
