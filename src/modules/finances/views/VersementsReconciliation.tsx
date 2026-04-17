import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button } from '@/shared/ui'
import {
  fetchBordereauLignes,
  fetchContratsCompagnie,
  updateLigneMatch,
  validerBordereau,
  fetchBordereaux,
} from '../api'
import { MONO } from '../styles/tableTokens'
import type { VersementBordereau, VersementLigne } from '../types'

function fmtEur(n: number): string {
  return (
    Number(n).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €'
  )
}

const MOIS_NOMS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const

function VersementsReconciliation() {
  const { id } = useParams<{ id: string }>()
  const [bordereau, setBordereau] = useState<VersementBordereau | null>(null)
  const [lignes, setLignes] = useState<VersementLigne[]>([])
  const [contrats, setContrats] = useState<{ id: string; client: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [bList, lData] = await Promise.all([
        fetchBordereaux(),
        fetchBordereauLignes(id),
      ])
      const b = bList.find((x) => x.id === id) ?? null
      setBordereau(b)
      setLignes(lData)
      if (b) {
        setContrats(await fetchContratsCompagnie(b.compagnie))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const autoMatched = useMemo(
    () => lignes.filter((l) => l.match_status === 'auto'),
    [lignes],
  )
  const ambigues = useMemo(
    () => lignes.filter((l) => l.match_status === 'ambigu'),
    [lignes],
  )
  const nonMatchees = useMemo(
    () => lignes.filter((l) => l.match_status === 'non_match'),
    [lignes],
  )
  const manuelles = useMemo(
    () => lignes.filter((l) => l.match_status === 'manuel'),
    [lignes],
  )

  const handleConfirm = useCallback(
    async (ligneId: string, contratId: string | null) => {
      try {
        await updateLigneMatch(ligneId, contratId, contratId ? 'manuel' : 'non_match')
        setToast('Ligne mise à jour')
        await load()
      } catch (e: unknown) {
        setToast(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
      }
    },
    [load],
  )

  const handleIgnore = useCallback(
    async (ligneId: string) => {
      try {
        await updateLigneMatch(ligneId, null, 'non_match')
        setToast('Ligne ignorée')
        await load()
      } catch (e: unknown) {
        setToast(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
      }
    },
    [load],
  )

  const handleValidate = useCallback(async () => {
    if (!id) return
    try {
      await validerBordereau(id)
      setToast('Bordereau validé')
      await load()
    } catch (e: unknown) {
      setToast(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
    }
  }, [id, load])

  if (!id) return <div style={{ padding: 24 }}>ID bordereau manquant.</div>
  if (loading) return <div style={{ padding: 24, color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ padding: 24, color: '#dc2626' }}>Erreur : {error}</div>
  if (!bordereau) return <div style={{ padding: 24 }}>Bordereau introuvable.</div>

  const canValidate = ambigues.length === 0

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <Link to="/finances/versements" style={{ fontSize: 12, color: '#64748b', textDecoration: 'none' }}>
          ← Retour aux versements
        </Link>
        <h1 style={{ margin: '8px 0 4px', fontSize: 22 }}>
          {bordereau.compagnie} — {MOIS_NOMS[bordereau.mois]} {bordereau.annee}
        </h1>
        <p style={{ color: '#64748b', fontSize: 13 }}>
          {bordereau.source_file_name ?? 'Bordereau'} ·{' '}
          <Badge tone={bordereau.status === 'validated' ? 'success' : 'info'}>
            {bordereau.status}
          </Badge>
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatBadge label="Auto-matchées" count={autoMatched.length} tone="success" />
        <StatBadge label="Manuelles" count={manuelles.length} tone="info" />
        <StatBadge label="Ambiguës" count={ambigues.length} tone="warning" />
        <StatBadge label="Non matchées" count={nonMatchees.length} tone="danger" />
        <div style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 15, fontWeight: 700, color: '#0f172a', alignSelf: 'center' }}>
          Total : {fmtEur(lignes.reduce((s, l) => s + l.montant, 0))}
        </div>
      </div>

      {/* Section 1 — Auto */}
      {autoMatched.length > 0 && (
        <Section title={`Auto-matchées (${autoMatched.length})`} tone="success">
          <LignesTable lignes={autoMatched} showContrat />
        </Section>
      )}

      {/* Section 2 — Ambiguës */}
      {ambigues.length > 0 && (
        <Section title={`Ambiguës (${ambigues.length})`} tone="warning">
          {ambigues.map((l) => (
            <AmbiguRow
              key={l.id}
              ligne={l}
              contrats={contrats}
              onConfirm={handleConfirm}
              onIgnore={handleIgnore}
            />
          ))}
        </Section>
      )}

      {/* Section 3 — Non matchées */}
      {nonMatchees.length > 0 && (
        <Section title={`Non matchées (${nonMatchees.length})`} tone="danger">
          {nonMatchees.map((l) => (
            <NonMatchRow
              key={l.id}
              ligne={l}
              contrats={contrats}
              onConfirm={handleConfirm}
            />
          ))}
        </Section>
      )}

      {/* Section 4 — Manuelles */}
      {manuelles.length > 0 && (
        <Section title={`Manuelles (${manuelles.length})`} tone="info">
          <LignesTable lignes={manuelles} showContrat />
        </Section>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {bordereau.status !== 'validated' && (
          <Button
            variant="primary"
            onClick={() => void handleValidate()}
            disabled={!canValidate}
          >
            {canValidate ? 'Valider le bordereau' : `${ambigues.length} ambiguë(s) à résoudre`}
          </Button>
        )}
      </div>

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

// ── Sub-components ─────────────────────────────────────────

function StatBadge({ label, count, tone }: { label: string; count: number; tone: 'success' | 'info' | 'warning' | 'danger' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Badge tone={tone}>{count}</Badge>
      <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
    </div>
  )
}

function Section({ title, tone, children }: { title: string; tone: 'success' | 'info' | 'warning' | 'danger'; children: React.ReactNode }) {
  const colors = { success: '#10b981', info: '#3b82f6', warning: '#f59e0b', danger: '#ef4444' }
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18, borderLeft: `4px solid ${colors[tone]}` }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, color: colors[tone] }}>{title}</h3>
      {children}
    </div>
  )
}

function LignesTable({ lignes, showContrat }: { lignes: VersementLigne[]; showContrat?: boolean }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#64748b', fontSize: 10, fontWeight: 600 }}>
            <th style={subTh}>Client (raw)</th>
            {showContrat && <th style={subTh}>Contrat matché</th>}
            <th style={{ ...subTh, textAlign: 'right' }}>Montant</th>
            <th style={subTh}>Type</th>
            <th style={subTh}>Confid.</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={subTd}>{l.client_raw}</td>
              {showContrat && (
                <td style={{ ...subTd, color: '#1D9E75', fontWeight: 500 }}>
                  {l.contrat_client ?? '—'}
                </td>
              )}
              <td style={{ ...subTd, textAlign: 'right', fontFamily: MONO, fontWeight: 600 }}>
                {fmtEur(l.montant)}
              </td>
              <td style={{ ...subTd, color: '#94a3b8', fontSize: 10 }}>{l.type_com ?? '—'}</td>
              <td style={{ ...subTd, fontFamily: MONO, fontSize: 10, color: '#64748b' }}>
                {l.match_confidence_pct != null ? `${l.match_confidence_pct}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AmbiguRow({
  ligne,
  contrats,
  onConfirm,
  onIgnore,
}: {
  ligne: VersementLigne
  contrats: { id: string; client: string }[]
  onConfirm: (ligneId: string, contratId: string | null) => Promise<void>
  onIgnore: (ligneId: string) => Promise<void>
}) {
  const [selected, setSelected] = useState(ligne.contrat_id ?? '')

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '8px 0',
        borderTop: '1px solid #f1f5f9',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 180 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{ligne.client_raw}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{ligne.type_com} · {fmtEur(ligne.montant)}</div>
      </div>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{ flex: 1, padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #cbd5e1', minWidth: 200 }}
      >
        <option value="">— Choisir un contrat —</option>
        {contrats.map((c) => (
          <option key={c.id} value={c.id}>{c.client}</option>
        ))}
      </select>
      <Button
        variant="primary"
        onClick={() => void onConfirm(ligne.id, selected || null)}
        disabled={!selected}
      >
        Confirmer
      </Button>
      <Button variant="ghost" onClick={() => void onIgnore(ligne.id)}>
        Ignorer
      </Button>
    </div>
  )
}

function NonMatchRow({
  ligne,
  contrats,
  onConfirm,
}: {
  ligne: VersementLigne
  contrats: { id: string; client: string }[]
  onConfirm: (ligneId: string, contratId: string | null) => Promise<void>
}) {
  const [selected, setSelected] = useState('')

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '8px 0',
        borderTop: '1px solid #f1f5f9',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 180 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{ligne.client_raw}</div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          {ligne.police_num ?? '—'} · {ligne.type_com ?? '—'} · {fmtEur(ligne.montant)}
        </div>
      </div>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{ flex: 1, padding: '4px 8px', fontSize: 12, borderRadius: 4, border: '1px solid #cbd5e1', minWidth: 200 }}
      >
        <option value="">— Rechercher un contrat —</option>
        {contrats.map((c) => (
          <option key={c.id} value={c.id}>{c.client}</option>
        ))}
      </select>
      <Button
        variant="primary"
        onClick={() => void onConfirm(ligne.id, selected || null)}
        disabled={!selected}
      >
        Matcher
      </Button>
    </div>
  )
}

const subTh: React.CSSProperties = {
  textAlign: 'left',
  padding: '4px 8px',
  borderBottom: '1px solid #e5e7eb',
}
const subTd: React.CSSProperties = { padding: '6px 8px' }

export default VersementsReconciliation
