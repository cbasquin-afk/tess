import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { supabase } from '@/shared/supabase'
import { useLeads } from '../hooks/useLeads'
import type { CallbackSummary, Lead } from '../types'

// Statuts du pipeline actif — fidèles au natif (config.js).
// On filtre par statut exact (PIPELINE_ALL_STATUTS) et NON par catégorie
// "En cours" : c'est plus restrictif et reflète la sémantique métier
// utilisée quotidiennement par les commerciaux.
const PIPELINE_CHAUD = [
  'Devis envoyé pas déballé',
  'Devis déballé R2 positionné',
  'R2 sans devis',
] as const

const PIPELINE_TIEDE = ['A relancer', 'En attente dispo offre'] as const

const PIPELINE_J30 = 'Lead de plus de 30 jours' as const

const PIPELINE_ALL_STATUTS: readonly string[] = [
  ...PIPELINE_CHAUD,
  ...PIPELINE_TIEDE,
  PIPELINE_J30,
]

const COMM_COLORS: Record<string, string> = {
  'Christopher BASQUIN': '#1D9E75',
  'Charlotte BOCOGNANO': '#378ADD',
  'Cheyenne DEBENATH': '#BA7517',
}

const MAX_ROWS = 200

function joursDepuisCreation(dateCreation: string | null): number {
  if (!dateCreation) return 0
  try {
    return differenceInDays(new Date(), parseISO(dateCreation.slice(0, 10)))
  } catch {
    return 0
  }
}

function delaiColor(jours: number): string {
  if (jours > 14) return '#E24B4A'
  if (jours >= 7) return '#BA7517'
  return '#1D9E75'
}

function statutColor(statut: string): string {
  if ((PIPELINE_CHAUD as readonly string[]).includes(statut)) return '#E24B4A'
  if ((PIPELINE_TIEDE as readonly string[]).includes(statut)) return '#BA7517'
  return '#888780'
}

function commColor(attribution: string | null): string {
  if (!attribution || attribution === '< Pioche >') return '#888780'
  return COMM_COLORS[attribution] ?? '#888780'
}

interface PipelineLead extends Lead {
  jours: number
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

function Pipeline() {
  const { leads, loading, error } = useLeads()
  const [filterStatut, setFilterStatut] = useState<string>('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(t)
  }, [toast])

  // Pool initial : leads actifs (statut dans PIPELINE_ALL_STATUTS)
  const allActive = useMemo<PipelineLead[]>(() => {
    return leads
      .filter((l) => PIPELINE_ALL_STATUTS.includes(l.statut))
      .map((l) => ({ ...l, jours: joursDepuisCreation(l.date_creation) }))
      .sort((a, b) => b.jours - a.jours)
  }, [leads])

  // Pool affiché : pool actif + filtre statut local
  const displayed = useMemo<PipelineLead[]>(() => {
    if (!filterStatut) return allActive
    return allActive.filter((l) => l.statut === filterStatut)
  }, [allActive, filterStatut])

  // KPIs calculés sur tout le pool actif (pas le filtré local) — conforme natif
  const kpis = useMemo(() => {
    const chaud = allActive.filter((l) =>
      (PIPELINE_CHAUD as readonly string[]).includes(l.statut),
    ).length
    const tiede = allActive.filter((l) =>
      (PIPELINE_TIEDE as readonly string[]).includes(l.statut),
    ).length
    const j30 = allActive.filter((l) => l.statut === PIPELINE_J30).length
    const maxAge = allActive[0]?.jours ?? 0
    return { chaud, tiede, j30, maxAge }
  }, [allActive])

  const visible = useMemo(() => displayed.slice(0, MAX_ROWS), [displayed])

  const sendableIds = useMemo(
    () =>
      visible
        .filter((l) => l.identifiant_projet != null)
        .map((l) => l.identifiant_projet),
    [visible],
  )
  const allVisibleSelected =
    sendableIds.length > 0 && sendableIds.every((id) => selected.has(id))

  const toggleOne = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (sendableIds.every((id) => prev.has(id))) {
        const next = new Set(prev)
        for (const id of sendableIds) next.delete(id)
        return next
      }
      const next = new Set(prev)
      for (const id of sendableIds) next.add(id)
      return next
    })
  }, [sendableIds])

  const handleSendCallback = useCallback(async () => {
    if (selected.size === 0) return
    setSending(true)
    try {
      const { data, error: err } = await supabase.functions.invoke<CallbackSummary>(
        'perflead-callback-send',
        { body: { lead_ids: Array.from(selected).map(String) } },
      )
      if (err) throw new Error(err.message)
      const summary = data ?? { sent: 0, skipped: 0, errors: 0, details: [] }
      const parts: string[] = []
      parts.push(`${summary.sent} envoyé(s)`)
      if (summary.skipped > 0) parts.push(`${summary.skipped} ignoré(s) (pas de mapping)`)
      if (summary.errors > 0) parts.push(`${summary.errors} erreur(s)`)
      setToast(parts.join(' · '))
      setSelected(new Set())
    } catch (e: unknown) {
      setToast(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSending(false)
    }
  }, [selected])

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Pipeline actif</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Leads en cours de traitement — triés du plus ancien au plus récent.
        </p>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        <Kpi
          label="Pipeline chaud"
          value={fmt(kpis.chaud)}
          hint="Devis envoyé / déballé / R2"
          color="#E24B4A"
        />
        <Kpi
          label="À relancer"
          value={fmt(kpis.tiede)}
          hint="A relancer + Attente offre"
          color="#BA7517"
        />
        <Kpi
          label="Lead +30 jours"
          value={fmt(kpis.j30)}
          hint="non clôturés"
          color="#378ADD"
        />
        <Kpi
          label="Âge max pipeline"
          value={`${kpis.maxAge}j`}
          hint="lead actif le plus ancien"
          color="#1D9E75"
        />
      </div>

      {/* Filtres locaux */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <select
          value={filterStatut}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setFilterStatut(e.target.value)
          }
          style={{
            padding: '6px 12px',
            fontSize: 13,
            border: '1px solid #d1d5db',
            borderRadius: 6,
            background: '#f9fafb',
            color: '#374151',
          }}
        >
          <option value="">Tous statuts pipeline</option>
          {PIPELINE_ALL_STATUTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        {filterStatut && (
          <button
            type="button"
            onClick={() => setFilterStatut('')}
            style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              color: '#6b7280',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Réinitialiser
          </button>
        )}

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={() => void handleSendCallback()}
          disabled={selected.size === 0 || sending}
          style={{
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            borderRadius: 6,
            cursor: selected.size === 0 || sending ? 'not-allowed' : 'pointer',
            background: selected.size === 0 || sending ? '#e5e7eb' : '#1f3a8a',
            color: selected.size === 0 || sending ? '#9ca3af' : '#fff',
          }}
        >
          {sending
            ? 'Envoi…'
            : `Envoyer statuts Mapapp${selected.size > 0 ? ` (${selected.size})` : ''}`}
        </button>

        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          Affichage {fmt(visible.length)} / {fmt(displayed.length)}
          {displayed.length > MAX_ROWS && ` (max ${MAX_ROWS})`} ·{' '}
          {fmt(allActive.length)} actifs au total
        </span>
      </div>

      {/* Toast */}
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

      {/* Tableau */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 18,
          overflowX: 'auto',
        }}
      >
        {visible.length === 0 ? (
          <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
            Aucun lead actif sur ce périmètre.
          </div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            <thead>
              <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
                <th style={{ ...th, width: 32 }}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    disabled={sendableIds.length === 0}
                    title="Tout sélectionner"
                  />
                </th>
                <th style={th}>Délai</th>
                <th style={th}>Statut</th>
                <th style={th}>Commercial</th>
                <th style={th}>Contact</th>
                <th style={th}>Tranche</th>
                <th style={{ ...th, textAlign: 'right' }}>OGGO</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((l) => {
                const dCol = delaiColor(l.jours)
                const sCol = statutColor(l.statut)
                const cCol = commColor(l.attribution)
                const prenom =
                  l.contact_prenom ?? l.prenom ?? ''
                const nom = l.contact_nom ?? l.nom ?? ''
                const nomComplet =
                  [prenom, nom].filter(Boolean).join(' ').trim() || '—'
                const commercial = l.attribution
                  ? l.attribution === '< Pioche >'
                    ? 'Pioche'
                    : (l.attribution.split(' ')[0] ?? l.attribution)
                  : '—'
                const hasProjectId = l.identifiant_projet != null
                const isSelected = hasProjectId && selected.has(l.identifiant_projet)
                return (
                  <tr
                    key={l.id ?? l.identifiant_projet ?? Math.random()}
                    style={{
                      borderTop: '1px solid #f1f5f9',
                      background: isSelected ? 'rgba(31,58,138,0.04)' : undefined,
                    }}
                  >
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!hasProjectId}
                        onChange={() =>
                          hasProjectId && toggleOne(l.identifiant_projet)
                        }
                        title={
                          hasProjectId
                            ? 'Sélectionner'
                            : 'Pas d\u2019identifiant projet'
                        }
                      />
                    </td>
                    <td style={td}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: 12,
                          background: `${dCol}15`,
                          color: dCol,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {l.jours}j
                      </span>
                    </td>
                    <td style={{ ...td, color: sCol, fontWeight: 500 }}>
                      {l.statut}
                    </td>
                    <td style={{ ...td, color: cCol, fontWeight: 600 }}>
                      {commercial}
                    </td>
                    <td style={{ ...td, color: '#0f172a' }}>{nomComplet}</td>
                    <td style={{ ...td, color: '#94a3b8' }}>
                      {l.tranche_age ?? '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {l.url_projet ? (
                        <a
                          href={l.url_projet}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: '#378ADD',
                            textDecoration: 'none',
                            fontSize: 12,
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: 4,
                            background: 'rgba(55,138,221,0.08)',
                            border: '1px solid rgba(55,138,221,0.25)',
                          }}
                        >
                          ↗ ouvrir
                        </a>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

interface KpiProps {
  label: string
  value: string
  hint?: string
  color?: string
}

function Kpi({ label, value, hint, color }: KpiProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          margin: '6px 0 2px',
          color: color ?? '#0f172a',
        }}
      >
        {value}
      </div>
      {hint && <div style={{ color: '#94a3b8', fontSize: 12 }}>{hint}</div>}
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }

export default Pipeline
