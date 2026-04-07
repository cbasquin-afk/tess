import { useMemo } from 'react'
import { useStats } from '../hooks/useStats'
import type { Lead } from '../types'

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

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

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
          }}
        >
          <h3 style={{ margin: 0, fontSize: 14 }}>Leads fournisseur</h3>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            {fmt(fournLeads.length)} leads · 500 max affichés
          </span>
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
                {fournLeads.slice(0, 500).map((l) => (
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
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }

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
