import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAnnuaire } from '../api'
import { StatutBadge } from '../components/StatutBadge'
import { PartenaireBadge } from '../components/PartenaireBadge'
import type { AnnuaireRow, StatutPage, StatutPartenaire } from '../types'
import { VERTICALES_ANNUAIRE, VERTICALE_LABELS } from '../types'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR')
  } catch {
    return iso
  }
}

function isStale(iso: string | null): boolean {
  if (!iso) return true
  const d = new Date(iso)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  return d < cutoff
}

function statutRank(s: string): number {
  if (s === 'publiee') return 0
  if (s === 'brouillon') return 1
  return 2
}

function Liste() {
  const [rows, setRows] = useState<AnnuaireRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [verticaleActive, setVerticaleActive] = useState<string>('mutuelle')
  const [tab, setTab] = useState<'' | StatutPage>('')
  const [filtrePartenaire, setFiltrePartenaire] = useState<StatutPartenaire | ''>('')
  const [filtreAlerte, setFiltreAlerte] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchAnnuaire(verticaleActive || undefined)
      .then((d) => {
        if (!cancelled) setRows(d)
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
  }, [verticaleActive])

  const kpis = useMemo(() => {
    const publiee = rows.filter((r) => r.statut_page === 'publiee')
    return {
      total: rows.length,
      publiees: publiee.length,
      partenairesDirects: publiee.filter(
        (r) => r.statut_partenaire === 'partenaire_direct',
      ).length,
      sansRegles: publiee.filter((r) => (r.nb_regles_reco ?? 0) === 0).length,
      alertes: publiee.filter((r) => r.alerte_verif === true).length,
    }
  }, [rows])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    const list = rows.filter((r) => {
      if (tab && r.statut_page !== tab) return false
      if (filtrePartenaire && r.statut_partenaire !== filtrePartenaire) return false
      if (filtreAlerte && !r.alerte_verif) return false
      if (s && !r.slug.toLowerCase().includes(s)) return false
      return true
    })
    list.sort((a, b) => {
      const d = statutRank(a.statut_page) - statutRank(b.statut_page)
      if (d !== 0) return d
      const na = a.note_courtier ?? -1
      const nb = b.note_courtier ?? -1
      return nb - na
    })
    return list
  }, [rows, tab, filtrePartenaire, filtreAlerte, search])

  if (loading) return <div style={{ padding: 24, color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ padding: 24, color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
        Annuaire compagnies
      </h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
        {kpis.total} fiches {VERTICALE_LABELS[verticaleActive] ?? verticaleActive}.
      </p>

      {/* Sélecteur verticale */}
      <div
        style={{
          display: 'flex',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 16,
          width: 'fit-content',
        }}
      >
        {VERTICALES_ANNUAIRE.map((v) => {
          const active = verticaleActive === v
          return (
            <button
              key={v}
              onClick={() => setVerticaleActive(v)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: active ? '#1f3a8a' : 'transparent',
                color: active ? '#fff' : '#64748b',
              }}
            >
              {VERTICALE_LABELS[v] ?? v}
            </button>
          )
        })}
      </div>

      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <Kpi label="Publiées" value={kpis.publiees} color="#10b981" />
        <Kpi label="Partenaires directs" value={kpis.partenairesDirects} color="#3b82f6" />
        <Kpi label="Sans règles reco" value={kpis.sansRegles} color="#ef4444" />
        <Kpi label="Alertes actives" value={kpis.alertes} color="#f59e0b" />
      </div>

      {/* Filtres */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {(
            [
              { id: '', label: 'Tous' },
              { id: 'publiee', label: 'Publiée' },
              { id: 'brouillon', label: 'Brouillon' },
              { id: 'archivee', label: 'Archivée' },
            ] as const
          ).map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? '#1f3a8a' : 'transparent',
                  color: active ? '#fff' : '#64748b',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <select
          value={filtrePartenaire}
          onChange={(e) => setFiltrePartenaire(e.target.value as StatutPartenaire | '')}
          style={selectStyle}
        >
          <option value="">Tous partenaires</option>
          <option value="partenaire_direct">Direct</option>
          <option value="partenaire_indirect">Indirect</option>
          <option value="non_partenaire">Non partenaire</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={filtreAlerte}
            onChange={(e) => setFiltreAlerte(e.target.checked)}
          />
          Avec alerte
        </label>

        <input
          type="search"
          placeholder="Rechercher par slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...selectStyle, minWidth: 220 }}
        />

        <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 'auto' }}>
          {filtered.length} / {rows.length} fiches
        </span>
      </div>

      {/* Table */}
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
            <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>
              <th style={th}>Compagnie</th>
              <th style={th}>Statut</th>
              <th style={th}>Partenaire</th>
              <th style={th}>Note</th>
              <th style={th}>Prix entrée</th>
              <th style={th}>Reco</th>
              <th style={th}>MAJ</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const stale = isStale(r.date_derniere_maj)
              return (
                <tr key={`${r.slug}-${r.verticale}`} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{r.slug}</div>
                    {r.groupe_appartenance && (
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{r.groupe_appartenance}</div>
                    )}
                  </td>
                  <td style={td}>
                    <StatutBadge value={r.statut_page as 'publiee' | 'brouillon' | 'archivee'} />
                  </td>
                  <td style={td}>
                    <PartenaireBadge
                      value={
                        r.statut_partenaire as
                          | 'partenaire_direct'
                          | 'partenaire_indirect'
                          | 'non_partenaire'
                      }
                    />
                  </td>
                  <td
                    style={{
                      ...td,
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 600,
                      color: r.note_courtier != null ? '#0f172a' : '#cbd5e1',
                    }}
                  >
                    {r.note_courtier != null ? `${r.note_courtier}/5` : '—'}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: r.prix_entree_marche != null ? '#0f172a' : '#cbd5e1',
                    }}
                  >
                    {r.prix_entree_marche != null ? `${r.prix_entree_marche}€` : '—'}
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: (r.nb_regles_reco ?? 0) > 0 ? '#dcfce7' : '#fee2e2',
                        color: (r.nb_regles_reco ?? 0) > 0 ? '#166534' : '#991b1b',
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {r.nb_regles_reco ?? 0}
                    </span>
                  </td>
                  <td
                    style={{
                      ...td,
                      color: stale ? '#dc2626' : '#64748b',
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {fmtDate(r.date_derniere_maj)}
                    {r.alerte_verif && <span style={{ marginLeft: 6 }}>⚠️</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <Link
                      to={`/annuaire/${r.slug}`}
                      style={{
                        padding: '4px 10px',
                        background: '#1f3a8a',
                        color: '#fff',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Éditer
                    </Link>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: 32,
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: 13,
                  }}
                >
                  Aucune fiche ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
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
          fontSize: 24,
          fontWeight: 700,
          color,
          marginTop: 4,
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        {value}
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  background: '#f8fafc',
}
const td: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle',
}
const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #e5e7eb',
  fontSize: 13,
  background: '#fff',
}

export default Liste
