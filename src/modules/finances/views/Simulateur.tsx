import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/shared/ui'
import { fetchOffresPourSimulation, fetchVerticalesOffres } from '../api'
import type { OffreRemuneration, SimulationLigne } from '../types'
import {
  DUREE_MAX_ANS,
  DUREE_MIN_ANS,
  computeLigne,
  expandOffreVariantes,
  fmtEur,
  labelVerticale,
} from '../utils/simulateur'

type SortKey = 'compagnie' | 'com1' | 'comN' | 'cumul'
type SortDir = 'asc' | 'desc'

function Simulateur() {
  const [verticales, setVerticales] = useState<string[]>([])
  const [verticale, setVerticale] = useState<string>('')
  const [cotisation, setCotisation] = useState<number>(50)
  const [duree, setDuree] = useState<number>(5)
  const [age, setAge] = useState<number | ''>('')

  const [offres, setOffres] = useState<OffreRemuneration[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [sortKey, setSortKey] = useState<SortKey>('cumul')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Fetch verticales au mount
  useEffect(() => {
    let cancelled = false
    fetchVerticalesOffres()
      .then((vs) => {
        if (cancelled) return
        setVerticales(vs)
        if (vs.length > 0) setVerticale((prev) => prev || vs[0])
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      )
    return () => { cancelled = true }
  }, [])

  // Fetch offres à chaque changement de verticale
  useEffect(() => {
    if (!verticale) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchOffresPourSimulation(verticale)
      .then((d) => { if (!cancelled) setOffres(d) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [verticale])

  const dureeSafe = Math.min(DUREE_MAX_ANS, Math.max(DUREE_MIN_ANS, Math.round(duree || 1)))
  const cotSafe = Math.max(0, Number(cotisation) || 0)

  const lignes = useMemo<SimulationLigne[]>(() => {
    const out: SimulationLigne[] = []
    for (const o of offres) {
      const variantes = expandOffreVariantes(o)
      for (const v of variantes) {
        out.push(computeLigne(v, cotSafe, dureeSafe))
      }
    }
    return out
  }, [offres, cotSafe, dureeSafe])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const arr = [...lignes]
    arr.sort((a, b) => {
      const va = (() => {
        switch (sortKey) {
          case 'compagnie': return (a.offre.compagnie_nom ?? '') + (a.offre.produit_nom ?? '')
          case 'com1': return a.com_an_1 ?? -Infinity
          case 'comN': return a.com_an_N ?? -Infinity
          case 'cumul': return a.cumul ?? -Infinity
        }
      })()
      const vb = (() => {
        switch (sortKey) {
          case 'compagnie': return (b.offre.compagnie_nom ?? '') + (b.offre.produit_nom ?? '')
          case 'com1': return b.com_an_1 ?? -Infinity
          case 'comN': return b.com_an_N ?? -Infinity
          case 'cumul': return b.cumul ?? -Infinity
        }
      })()
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb, 'fr') * dir
      }
      return ((va as number) - (vb as number)) * dir
    })
    return arr
  }, [lignes, sortKey, sortDir])

  const nbAVerifier = useMemo(
    () => offres.filter((o) => o.statut_data === 'incomplet' || o.statut_data === 'a_verifier').length,
    [offres],
  )

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(k)
      setSortDir(k === 'compagnie' ? 'asc' : 'desc')
    }
  }

  function toggleExpand(key: string) {
    setExpanded((e) => ({ ...e, [key]: !e[key] }))
  }

  function sortArrow(k: SortKey) {
    if (sortKey !== k) return ''
    return sortDir === 'asc' ? ' ▲' : ' ▼'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Simulateur de rémunération</h1>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: 13 }}>
          Compare les offres commerciales distribuées par Tessoria pour un profil
          de client donné et estime le risque de reprise sur les 24 premiers mois.
        </p>
      </div>

      {/* Formulaire */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 16,
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <Field label="Verticale">
          <select
            value={verticale}
            onChange={(e) => setVerticale(e.target.value)}
            style={inputStyle}
          >
            {verticales.length === 0 && <option value="">—</option>}
            {verticales.map((v) => (
              <option key={v} value={v}>{labelVerticale(v)}</option>
            ))}
          </select>
        </Field>
        <Field label="Cotisation mensuelle (€)">
          <input
            type="number"
            min={0}
            step={1}
            value={cotisation}
            onChange={(e) => setCotisation(Number(e.target.value))}
            style={inputStyle}
          />
        </Field>
        <Field label="Durée projet (années)">
          <input
            type="number"
            min={DUREE_MIN_ANS}
            max={DUREE_MAX_ANS}
            step={1}
            value={duree}
            onChange={(e) => setDuree(Number(e.target.value))}
            style={inputStyle}
          />
        </Field>
        <Field label="Âge assuré (optionnel)">
          <input
            type="number"
            min={0}
            max={120}
            step={1}
            value={age}
            onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
            style={inputStyle}
          />
        </Field>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          Cotisation annuelle :{' '}
          <strong style={{ color: '#0f172a' }}>{fmtEur(cotSafe * 12)}</strong>
        </div>
      </div>

      {/* État */}
      {loading && <div style={{ color: '#64748b', fontSize: 13 }}>Chargement…</div>}
      {error && <div style={{ color: '#dc2626', fontSize: 13 }}>Erreur : {error}</div>}

      {/* Tableau */}
      {!loading && !error && verticale && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 0,
            overflowX: 'auto',
          }}
        >
          {sorted.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Aucune offre référencée pour cette verticale. Vérifier TessPartenaires.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600, background: '#f8fafc' }}>
                  <th style={thSort} onClick={() => toggleSort('compagnie')}>
                    Compagnie / Produit{sortArrow('compagnie')}
                  </th>
                  <th style={th}>Type</th>
                  <th style={thSortR} onClick={() => toggleSort('com1')}>
                    Com An 1{sortArrow('com1')}
                  </th>
                  <th style={thSortR} onClick={() => toggleSort('comN')}>
                    Com An {dureeSafe}{sortArrow('comN')}
                  </th>
                  <th style={thSortR} onClick={() => toggleSort('cumul')}>
                    Cumul {dureeSafe} ans{sortArrow('cumul')}
                  </th>
                  <th style={thR}>Reprise An 1</th>
                  <th style={thR}>Reprise An 2</th>
                  <th style={thR}>Reprise An 3</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const isOpen = !!expanded[r.key]
                  const surcomTaux = r.offre.surcom_actif ? Number(r.offre.surcom_taux_pct) : null
                  return (
                    <>
                      <tr
                        key={r.key}
                        onClick={() => toggleExpand(r.key)}
                        style={{
                          borderTop: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: isOpen ? '#f8fafc' : 'transparent',
                        }}
                      >
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>
                              {isOpen ? '▾' : '▸'}
                            </span>
                            <strong style={{ color: '#0f172a' }}>
                              {r.offre.compagnie_nom_court || r.offre.compagnie_nom || '—'}
                            </strong>
                            <span style={{ color: '#475569' }}>· {r.offre.produit_nom ?? '—'}</span>
                            {r.variant_label && (
                              <Badge tone="neutral">{r.variant_label}</Badge>
                            )}
                            {r.offre.surcom_actif && surcomTaux && Number.isFinite(surcomTaux) && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  background: '#ede9fe',
                                  color: '#6d28d9',
                                }}
                              >
                                Surcom +{surcomTaux}%
                              </span>
                            )}
                            {(r.offre.statut_data === 'incomplet' || r.offre.statut_data === 'a_verifier') && (
                              <Badge tone="warning">
                                {r.offre.statut_data === 'incomplet' ? 'Incomplet' : 'À vérifier'}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td style={{ ...td, color: '#475569', fontSize: 11 }}>
                          {prettyCalcType(r.calc_type)}
                        </td>
                        <td style={tdNum}>{fmtEur(r.com_an_1)}</td>
                        <td style={tdNum}>{fmtEur(r.com_an_N)}</td>
                        <td style={{ ...tdNum, fontWeight: 700, color: '#0f172a' }}>
                          {fmtEur(r.cumul)}
                        </td>
                        <td style={tdReprise}>{fmtEur(r.reprise_an_1)}</td>
                        <td style={tdReprise}>{fmtEur(r.reprise_an_2)}</td>
                        <td style={tdReprise}>{fmtEur(r.reprise_an_3)}</td>
                      </tr>
                      {isOpen && (
                        <tr style={{ background: '#f8fafc' }}>
                          <td colSpan={8} style={{ padding: '12px 16px 18px', fontSize: 12 }}>
                            <DetailExpand ligne={r} />
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Footer */}
      {!loading && !error && verticale && sorted.length > 0 && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 12, color: '#64748b' }}>
          <span>
            <strong style={{ color: '#0f172a' }}>{sorted.length}</strong>{' '}
            offre{sorted.length > 1 ? 's' : ''} trouvée{sorted.length > 1 ? 's' : ''}
          </span>
          {nbAVerifier > 0 && (
            <span style={{ color: '#b45309', fontWeight: 600 }}>
              ⚠ {nbAVerifier} offre{nbAVerifier > 1 ? 's' : ''} à vérifier
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function DetailExpand({ ligne }: { ligne: SimulationLigne }) {
  const o = ligne.offre
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>
          FORMULE
        </span>
        <div style={{ color: '#0f172a', fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 12 }}>
          {ligne.formule || '—'}
        </div>
      </div>
      {ligne.abattement < 1 && (
        <div>
          <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>
            ABATTEMENT APPLIQUÉ
          </span>
          <div style={{ color: '#0f172a' }}>{Math.round(ligne.abattement * 100)}%</div>
          {o.precompte_conditions && o.precompte_conditions.toUpperCase().includes('NR') && (
            <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
              Un abattement moindre peut s'appliquer en cas de non-résiliation.
            </div>
          )}
        </div>
      )}
      {o.precompte_conditions && (
        <div>
          <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>
            CONDITIONS DE PRÉCOMPTE
          </span>
          <div style={{ color: '#475569' }}>{o.precompte_conditions}</div>
        </div>
      )}
      {o.surcom_actif && o.surcom_conditions && (
        <div>
          <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>
            CONDITIONS DE SURCOM
          </span>
          <div style={{ color: '#475569' }}>{o.surcom_conditions}</div>
        </div>
      )}
      {o.compagnie_type_relation && (
        <div style={{ color: '#94a3b8', fontSize: 11 }}>
          Relation : {o.compagnie_type_relation}
          {o.compagnie_statut_protocole && ` · Protocole : ${o.compagnie_statut_protocole}`}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>{label}</label>
      {children}
    </div>
  )
}

function prettyCalcType(t: string): string {
  switch (t) {
    case 'LR': return 'Linéaire'
    case 'PA': return 'Précompté'
    case 'LE': return 'Linéaire escompté'
    case 'PA_LR_PRECOMPTE': return 'Précompté'
    case 'PA_LR_LINEAIRE': return 'Linéaire'
    default: return t
  }
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: 13,
  border: '1px solid #d1d5db',
  borderRadius: 6,
  background: '#f9fafb',
  color: '#0f172a',
  minWidth: 130,
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
}
const thR: React.CSSProperties = { ...th, textAlign: 'right' }
const thSort: React.CSSProperties = { ...th, cursor: 'pointer', userSelect: 'none' }
const thSortR: React.CSSProperties = { ...thR, cursor: 'pointer', userSelect: 'none' }

const td: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle',
}
const tdNum: React.CSSProperties = {
  ...td,
  textAlign: 'right',
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  whiteSpace: 'nowrap',
}
const tdReprise: React.CSSProperties = {
  ...tdNum,
  color: '#be123c',
  background: '#fff1f2',
}

export default Simulateur
