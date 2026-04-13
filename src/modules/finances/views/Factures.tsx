import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/shared/ui'
import { fetchFactures, updateFactureStatut } from '../api'
import {
  tableStyle,
  trHead,
  th,
  thRight,
  td,
  tdMontant,
  trBody,
  MONO,
} from '../styles/tableTokens'
import type { FactureMandataire, StatutFacture } from '../types'

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

const STATUT_TONES: Record<StatutFacture, 'neutral' | 'info' | 'warning' | 'success'> = {
  a_generer: 'neutral',
  generee: 'info',
  envoyee: 'warning',
  payee: 'success',
}

const STATUT_LABELS: Record<StatutFacture, string> = {
  a_generer: 'À générer',
  generee: 'Générée',
  envoyee: 'Envoyée',
  payee: 'Payée',
}

const NEXT_STATUT: Partial<Record<StatutFacture, StatutFacture>> = {
  a_generer: 'generee',
  generee: 'envoyee',
  envoyee: 'payee',
}

const NEXT_LABEL: Partial<Record<StatutFacture, string>> = {
  a_generer: 'Marquer générée',
  generee: 'Marquer envoyée',
  envoyee: 'Marquer payée',
}

function fmtEur(n: number): string {
  return (
    Number(n).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €'
  )
}

function Factures() {
  const [factures, setFactures] = useState<FactureMandataire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtreStatut, setFiltreStatut] = useState<StatutFacture | ''>('')
  const [filtreMandataire, setFiltreMandataire] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setFactures(await fetchFactures())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const mandataires = useMemo(() => {
    const set = new Set<string>()
    for (const f of factures) {
      if (f.commercial_prenom) set.add(f.commercial_prenom)
    }
    return Array.from(set).sort()
  }, [factures])

  const filtered = useMemo(() => {
    return factures.filter((f) => {
      if (filtreStatut && f.statut !== filtreStatut) return false
      if (filtreMandataire && f.commercial_prenom !== filtreMandataire) return false
      return true
    })
  }, [factures, filtreStatut, filtreMandataire])

  const handleAdvance = useCallback(
    async (f: FactureMandataire) => {
      const next = NEXT_STATUT[f.statut]
      if (!next) return
      try {
        await updateFactureStatut(f.id, next)
        await reload()
      } catch (e: unknown) {
        alert(`Erreur : ${e instanceof Error ? e.message : String(e)}`)
      }
    },
    [reload],
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Finances — Factures mandataires</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Suivi des factures de commissions mandataires.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value as StatutFacture | '')}
          style={selectStyle}
        >
          <option value="">Tous statuts</option>
          {Object.entries(STATUT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filtreMandataire}
          onChange={(e) => setFiltreMandataire(e.target.value)}
          style={selectStyle}
        >
          <option value="">Tous mandataires</option>
          {mandataires.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: '#6b7280' }}>
          {filtered.length} facture{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {loading && <div style={{ color: '#64748b', fontSize: 14 }}>Chargement…</div>}
      {error && (
        <div style={{ padding: 16, background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 14 }}>
          Erreur : {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 18 }}>
          {filtered.length === 0 ? (
            <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
              Aucune facture trouvée.
            </div>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={trHead}>
                  <th style={th}>Mandataire</th>
                  <th style={th}>Période</th>
                  <th style={th}>N° facture</th>
                  <th style={thRight}>Montant HT</th>
                  <th style={thRight}>TVA</th>
                  <th style={thRight}>TTC</th>
                  <th style={th}>Statut</th>
                  <th style={{ ...th, width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id} style={trBody}>
                    <td style={{ ...td, fontWeight: 500 }}>
                      {f.commercial_prenom ?? '—'}
                    </td>
                    <td style={td}>
                      {MOIS_NOMS[f.mois]} {f.annee}
                    </td>
                    <td style={{ ...td, fontFamily: MONO, fontSize: 12 }}>
                      {f.numero_facture ?? '—'}
                    </td>
                    <td style={tdMontant}>{fmtEur(f.montant_ht)}</td>
                    <td style={{ ...tdMontant, color: '#64748b' }}>
                      {fmtEur(f.montant_tva)}
                    </td>
                    <td style={{ ...tdMontant, fontWeight: 600 }}>
                      {fmtEur(f.montant_ttc)}
                    </td>
                    <td style={td}>
                      <Badge tone={STATUT_TONES[f.statut]}>
                        {STATUT_LABELS[f.statut] ?? f.statut}
                      </Badge>
                    </td>
                    <td style={td}>
                      {NEXT_STATUT[f.statut] && (
                        <button onClick={() => handleAdvance(f)} style={btnAction}>
                          {NEXT_LABEL[f.statut]}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: 13,
  background: '#fff',
}

const btnAction: React.CSSProperties = {
  padding: '4px 10px',
  background: '#1f3a8a',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
}

export default Factures
