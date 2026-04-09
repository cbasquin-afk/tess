import { useMemo, useState, type ChangeEvent } from 'react'
import { useVersements } from '../hooks/useVersements'
import type { Versement } from '../types'
import { tableStyle, trHead, th, thRight, td, tdMontant, trFooter, tdFooterLabel, tdFooterMontant, trBody, MONO } from '../styles/tableTokens'

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

function fmtEur(n: number | null): string {
  if (n === null) return '—'
  return (
    Number(n).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' €'
  )
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return (
      String(d.getDate()).padStart(2, '0') +
      '/' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '/' +
      d.getFullYear()
    )
  } catch {
    return iso
  }
}

function fmtMois(annee: number, mois: number): string {
  return `${MOIS_NOMS[mois] ?? mois} ${annee}`
}

function ecartColor(ecart: number | null): string {
  if (ecart === null) return '#94a3b8'
  if (ecart > 0) return '#1D9E75'
  if (ecart < 0) return '#E24B4A'
  return '#94a3b8'
}

function Versements() {
  const { versements, loading, error } = useVersements()
  const [filterCompagnie, setFilterCompagnie] = useState<string>('')
  const [filterAnnee, setFilterAnnee] = useState<number | null>(null)

  const compagnies = useMemo<string[]>(() => {
    const set = new Set<string>()
    for (const v of versements) if (v.compagnie) set.add(v.compagnie)
    return Array.from(set).sort()
  }, [versements])

  const annees = useMemo<number[]>(() => {
    const set = new Set<number>()
    for (const v of versements) set.add(v.annee)
    return Array.from(set).sort((a, b) => b - a)
  }, [versements])

  const visible = useMemo<Versement[]>(() => {
    let rows = versements
    if (filterCompagnie) {
      rows = rows.filter((v) => v.compagnie === filterCompagnie)
    }
    if (filterAnnee !== null) {
      rows = rows.filter((v) => v.annee === filterAnnee)
    }
    return [...rows].sort(
      (a, b) => b.annee - a.annee || b.mois - a.mois,
    )
  }, [versements, filterCompagnie, filterAnnee])

  const totals = useMemo(() => {
    return visible.reduce(
      (s, v) => ({
        verse: s.verse + (v.verse ?? 0),
        prevu: s.prevu + (v.prevu ?? 0),
        ecart: s.ecart + (v.ecart ?? 0),
      }),
      { verse: 0, prevu: 0, ecart: 0 },
    )
  }, [visible])

  if (loading)
    return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  // ── État vide informatif ─────────────────────────────────────
  if (versements.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Versements compagnies</h1>
          <p style={{ color: '#64748b', marginTop: 4 }}>
            Suivi des versements réels vs prévus par compagnie et par mois.
          </p>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px dashed #cbd5e1',
            borderRadius: 10,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏦</div>
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: 16,
              color: '#0f172a',
              fontWeight: 600,
            }}
          >
            Aucun versement enregistré
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: '#64748b',
              lineHeight: 1.6,
              maxWidth: 480,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Les versements compagnies seront saisis manuellement ou via
            l'import depuis le fichier Excel de suivi.
            <br />
            <span
              style={{
                fontSize: 11,
                color: '#94a3b8',
                marginTop: 8,
                display: 'inline-block',
              }}
            >
              Sprint dédié à venir : saisie + import.
            </span>
          </p>
        </div>
      </div>
    )
  }

  // ── Vue avec données ────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Versements compagnies</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Suivi des versements réels vs prévus par compagnie et par mois.
        </p>
      </div>

      {/* Filtres */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {/* Compagnies pills */}
        <div
          style={{
            display: 'flex',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            onClick={() => setFilterCompagnie('')}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: filterCompagnie === '' ? '#1f3a8a' : 'transparent',
              color: filterCompagnie === '' ? '#fff' : '#64748b',
            }}
          >
            Toutes
          </button>
          {compagnies.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilterCompagnie(c)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background:
                  filterCompagnie === c ? '#1f3a8a' : 'transparent',
                color: filterCompagnie === c ? '#fff' : '#64748b',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Sélecteur année */}
        <select
          value={filterAnnee ?? ''}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setFilterAnnee(e.target.value ? parseInt(e.target.value, 10) : null)
          }
          style={{
            background: '#f9fafb',
            border: '1px solid #d1d5db',
            color: '#374151',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 12,
            outline: 'none',
          }}
        >
          <option value="">Toutes années</option>
          {annees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <div style={{ flex: 1 }} />
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          {visible.length} ligne{visible.length > 1 ? 's' : ''}
        </span>
      </div>

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
          <div
            style={{
              color: '#94a3b8',
              fontSize: 13,
              fontStyle: 'italic',
              textAlign: 'center',
              padding: 24,
            }}
          >
            Aucun versement sur ce filtre.
          </div>
        ) : (
          <table style={tableStyle}>
            <colgroup>
              <col style={{ width: 120 }} />
              <col style={{ width: 130 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col />
            </colgroup>
            <thead>
              <tr style={trHead}>
                <th style={th}>Compagnie</th>
                <th style={th}>Mois</th>
                <th style={thRight}>Versé</th>
                <th style={thRight}>Prévu</th>
                <th style={thRight}>Écart</th>
                <th style={th}>Date versement</th>
                <th style={th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((v, i) => (
                <tr
                  key={`${v.compagnie}-${v.annee}-${v.mois}-${i}`}
                  style={trBody}
                >
                  <td
                    style={{
                      ...td,
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  >
                    {v.compagnie}
                  </td>
                  <td style={{ ...td, color: '#475569' }}>
                    {fmtMois(v.annee, v.mois)}
                  </td>
                  <td
                    style={{
                      ...tdMontant,
                      color: v.verse !== null ? '#0f172a' : '#cbd5e1',
                      fontWeight: v.verse !== null ? 600 : 400,
                    }}
                  >
                    {fmtEur(v.verse)}
                  </td>
                  <td
                    style={{
                      ...tdMontant,
                      color: v.prevu !== null ? '#64748b' : '#cbd5e1',
                    }}
                  >
                    {fmtEur(v.prevu)}
                  </td>
                  <td
                    style={{
                      ...tdMontant,
                      color: ecartColor(v.ecart),
                      fontWeight: 700,
                    }}
                  >
                    {v.ecart !== null
                      ? (v.ecart > 0 ? '+' : '') + fmtEur(v.ecart)
                      : '—'}
                  </td>
                  <td
                    style={{
                      ...td,
                      color: '#94a3b8',
                      fontFamily: MONO,
                      fontSize: 11,
                    }}
                  >
                    {fmtDate(v.date_versement)}
                  </td>
                  <td
                    style={{
                      ...td,
                      color: '#94a3b8',
                      fontSize: 11,
                      maxWidth: 240,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={v.notes ?? undefined}
                  >
                    {v.notes ?? '—'}
                  </td>
                </tr>
              ))}
              <tr style={trFooter}>
                <td colSpan={2} style={tdFooterLabel}>
                  Total
                </td>
                <td
                  style={{ ...tdFooterMontant, color: '#0f172a' }}
                >
                  {fmtEur(totals.verse)}
                </td>
                <td
                  style={{ ...tdFooterMontant, color: '#64748b' }}
                >
                  {fmtEur(totals.prevu)}
                </td>
                <td
                  style={{ ...tdFooterMontant, color: ecartColor(totals.ecart) }}
                >
                  {(totals.ecart > 0 ? '+' : '') + fmtEur(totals.ecart)}
                </td>
                <td colSpan={2} style={td}></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Versements
