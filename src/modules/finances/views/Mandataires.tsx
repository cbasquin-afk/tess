import { useMemo, useState } from 'react'
import { useFinancesCtx } from '../context/FinancesContext'
import { useCommissionsDetail } from '../hooks/useCommissionsDetail'
import { useRetractations } from '../hooks/useRetractations'
import type {
  CAParCommercial,
  CommissionDetail,
  ContratLean,
  RetractationRow,
} from '../types'

const COMMERCIAUX = ['Charlotte', 'Cheyenne', 'Mariam', 'Christopher'] as const
type Commercial = (typeof COMMERCIAUX)[number] | 'Tous'

const COMM_COLORS: Record<string, string> = {
  Charlotte: '#378ADD',
  Cheyenne: '#BA7517',
  Mariam: '#534AB7',
  Christopher: '#1D9E75',
  Tous: '#64748b',
}

const COMM_BG: Record<string, string> = {
  Charlotte: '#dbeafe',
  Cheyenne: '#fef3c7',
  Mariam: '#ede9fe',
  Christopher: '#dcfce7',
}

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

const OBJECTIFS = {
  CA_JOUR: 600,
  PANIER: 100,
  CA_MOYEN: 300,
  CONTRATS: 44,
  FRAIS: 500,
} as const

interface TauxMandataire {
  source: string
  taux: string
  description: string
}

const REFERENTIEL_TAUX: TauxMandataire[] = [
  { source: 'Lead', taux: '25%', description: 'CA santé lead' },
  { source: 'Recommandation', taux: '40%', description: 'CA recommandation' },
  { source: 'Multi-équipement', taux: '40%', description: 'CA multi-équipement' },
  { source: 'Frais de service', taux: '40%', description: '40% des frais facturés' },
  { source: 'Reco partagée', taux: '20%', description: 'Recommandation partagée' },
  {
    source: 'Linéaire / Replacement',
    taux: '10%',
    description: 'Commissionnement linéaire',
  },
  {
    source: 'Avis 5 étoiles',
    taux: '5€/avis',
    description: 'Bonus qualité (8 avis mini)',
  },
]

function fmtEur(n: number): string {
  return (
    Number(n).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + ' €'
  )
}

function fmtMois(annee: number, mois: number): string {
  return `${MOIS_NOMS[mois] ?? mois} ${annee}`
}

// Estimation du taux compagnie 1ère année basée sur le code
// type_commission. Regex universelle qui extrait le premier nombre
// après le préfixe (PA, PS, LE, LR, LA, Linéaire) — couvre tous les
// formats trouvés en base : 'PA 34/10', 'PS 40/12/8', 'LR 30/10',
// 'LA 10', 'Linéaire 20', etc.
function tauxCompagnieEstime(typeCommission: string | null): number {
  if (!typeCommission) return 0.3
  const tc = typeCommission.toUpperCase().trim()

  // Préfixes PA / PS : 1ère année
  const matchPaPs = tc.match(/^(?:PA|PS)\s+(\d+)/)
  if (matchPaPs && matchPaPs[1]) return parseInt(matchPaPs[1], 10) / 100

  // Préfixes LE / LR / LA : linéaire annoncé
  const matchLeLrLa = tc.match(/^(?:LE|LR|LA)\s+(\d+)/)
  if (matchLeLrLa && matchLeLrLa[1])
    return parseInt(matchLeLrLa[1], 10) / 100

  // 'Linéaire X' ou 'Lineaire X'
  if (tc.startsWith('LINÉAIRE') || tc.startsWith('LINEAIRE')) {
    const m = tc.match(/(\d+)/)
    if (m && m[1]) return parseInt(m[1], 10) / 100
  }

  return 0.3 // défaut prudent
}

// Manque à gagner mandataire estimé sur une rétractation :
// cotisation × taux_cie × 12 mois × taux_mandataire
function comMandataireEstimee(row: RetractationRow): number {
  if (!row.cotisation_mensuelle) return 0
  const tauxCie = tauxCompagnieEstime(row.type_commission)
  const comSociete1a = row.cotisation_mensuelle * tauxCie * 12
  return comSociete1a * row.taux_mandataire
}

const ORIGINE_COLORS: Record<string, string> = {
  Mapapp: '#378ADD',
  Site: '#1D9E75',
  Recommandation: '#534AB7',
  'Back-office': '#64748b',
  'Multi-équipement': '#BA7517',
}

function origineCol(o: string | null): string {
  if (!o) return '#94a3b8'
  return ORIGINE_COLORS[o] ?? '#94a3b8'
}

function isInMonth(
  isoDate: string | null,
  year: number,
  month: number,
): boolean {
  if (!isoDate) return false
  try {
    const d = new Date(isoDate)
    return d.getFullYear() === year && d.getMonth() + 1 === month
  } catch {
    return false
  }
}

interface CommercialKpis {
  commercial: string
  ca_societe: number
  ca_mandataire: number
  frais: number
  nb_contrats: number
  panier_moyen: number
  ca_moyen_par_contrat: number
  ca_par_jour: number
  projection: number
}

function buildKpisForCommercial(
  commercial: string,
  caRow: CAParCommercial | null,
  contrats: ContratLean[],
  year: number,
  month: number,
  joursEcoules: number,
  joursDansMois: number,
): CommercialKpis {
  const ca_societe = caRow?.ca_societe ?? 0
  const ca_mandataire = caRow?.ca_mandataire ?? 0
  const frais = caRow?.frais ?? 0
  const nb_contrats = caRow?.nb_contrats ?? 0

  // Panier moyen : moyenne des cotisations_mensuelle des contrats du
  // commercial signés ce mois-ci
  const contratsDuMois = contrats.filter(
    (c) =>
      c.commercial_prenom === commercial &&
      isInMonth(c.date_signature, year, month) &&
      c.cotisation_mensuelle !== null &&
      c.cotisation_mensuelle > 0,
  )
  const panier_moyen =
    contratsDuMois.length > 0
      ? contratsDuMois.reduce(
          (s, c) => s + (c.cotisation_mensuelle ?? 0),
          0,
        ) / contratsDuMois.length
      : 0

  const ca_moyen_par_contrat = nb_contrats > 0 ? ca_societe / nb_contrats : 0
  const ca_par_jour = joursEcoules > 0 ? ca_societe / joursEcoules : 0
  const projection =
    joursEcoules > 0 ? (ca_societe * joursDansMois) / joursEcoules : 0

  return {
    commercial,
    ca_societe,
    ca_mandataire,
    frais,
    nb_contrats,
    panier_moyen,
    ca_moyen_par_contrat,
    ca_par_jour,
    projection,
  }
}

function statutCouleur(pct: number): {
  color: string
  background: string
  label: string
} {
  if (pct >= 100)
    return { color: '#1D9E75', background: '#dcfce7', label: '✓' }
  if (pct >= 80)
    return { color: '#BA7517', background: '#fef3c7', label: '!' }
  return { color: '#E24B4A', background: '#fee2e2', label: '✗' }
}

function Mandataires() {
  const { caParCommercial, contrats, loading, error } = useFinancesCtx()
  const { rows: allCommissionsDetail, loading: loadingDetail } =
    useCommissionsDetail()
  const { rows: allRetractations, loading: loadingRetracs } = useRetractations()
  const [selected, setSelected] = useState<Commercial>('Tous')

  const now = new Date()
  const curYear = now.getFullYear()
  const curMonth = now.getMonth() + 1
  const joursEcoules = now.getDate()
  const joursDansMois = new Date(curYear, curMonth, 0).getDate()

  // Map commercial → CAParCommercial du mois courant
  const caCurrentMonthMap = useMemo(() => {
    const m = new Map<string, CAParCommercial>()
    for (const r of caParCommercial) {
      if (r.annee === curYear && r.mois === curMonth) {
        m.set(r.commercial_prenom, r)
      }
    }
    return m
  }, [caParCommercial, curYear, curMonth])

  // KPIs pour chaque commercial (utile en mode "Tous" et pour le sélectionné)
  const allKpis = useMemo<CommercialKpis[]>(() => {
    return COMMERCIAUX.map((c) =>
      buildKpisForCommercial(
        c,
        caCurrentMonthMap.get(c) ?? null,
        contrats,
        curYear,
        curMonth,
        joursEcoules,
        joursDansMois,
      ),
    )
  }, [
    caCurrentMonthMap,
    contrats,
    curYear,
    curMonth,
    joursEcoules,
    joursDansMois,
  ])

  // KPIs du commercial sélectionné (si pas "Tous")
  const selectedKpis = useMemo<CommercialKpis | null>(() => {
    if (selected === 'Tous') return null
    return allKpis.find((k) => k.commercial === selected) ?? null
  }, [allKpis, selected])

  // Historique mensuel du commercial sélectionné (si pas "Tous")
  const historique = useMemo<CAParCommercial[]>(() => {
    if (selected === 'Tous') return []
    return caParCommercial.filter((r) => r.commercial_prenom === selected)
  }, [caParCommercial, selected])

  // Détail des commissions du mois courant, filtré par commercial
  // sélectionné. Ignore les lignes 'frais' (type_ligne) et tri par
  // montant_com_societe DESC.
  const commissionsMois = useMemo<CommissionDetail[]>(() => {
    return allCommissionsDetail
      .filter(
        (r) =>
          r.annee === curYear &&
          r.mois === curMonth &&
          r.type_ligne !== 'frais' &&
          (selected === 'Tous' || r.commercial_prenom === selected),
      )
      .sort((a, b) => b.montant_com_societe - a.montant_com_societe)
  }, [allCommissionsDetail, curYear, curMonth, selected])

  // Total mandataire du mois (filtre commercial respecté)
  const totalMandataireMois = useMemo(
    () => commissionsMois.reduce((s, r) => s + r.montant_com_mandataire, 0),
    [commissionsMois],
  )

  // Rétractations filtrées par commercial sélectionné
  const retractations = useMemo<RetractationRow[]>(() => {
    return allRetractations
      .filter(
        (r) =>
          selected === 'Tous' || r.commercial_prenom === selected,
      )
      .sort((a, b) => {
        // Tri par commercial puis date desc
        const c = (a.commercial_prenom ?? '').localeCompare(
          b.commercial_prenom ?? '',
          'fr',
        )
        if (c !== 0) return c
        return (b.date_signature ?? '').localeCompare(a.date_signature ?? '')
      })
  }, [allRetractations, selected])

  // Manque à gagner total estimé (mandataire) sur les rétractations filtrées
  const totalManqueAGagner = useMemo(
    () =>
      retractations.reduce((s, r) => s + comMandataireEstimee(r), 0),
    [retractations],
  )

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>Mandataires</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Tableau de bord individuel par commercial — performance vs objectifs.
        </p>
      </div>

      {/* Pills sélecteur commercial */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 14,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        {(['Tous', ...COMMERCIAUX] as const).map((c) => {
          const active = selected === c
          const col = COMM_COLORS[c] ?? '#64748b'
          return (
            <button
              key={c}
              type="button"
              onClick={() => setSelected(c)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${active ? col : '#d1d5db'}`,
                cursor: 'pointer',
                background: active ? col : 'transparent',
                color: active ? '#fff' : col,
                borderRadius: 6,
              }}
            >
              {c}
            </button>
          )
        })}
      </div>

      {/* Mode Tous : grid des 4 KPI cards par commercial */}
      {selected === 'Tous' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
          }}
        >
          {allKpis.map((k) => {
            const col = COMM_COLORS[k.commercial] ?? '#64748b'
            const bg = COMM_BG[k.commercial] ?? '#f3f4f6'
            return (
              <div
                key={k.commercial}
                style={{
                  background: bg,
                  border: `1px solid ${col}30`,
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: col,
                    marginBottom: 10,
                  }}
                >
                  {k.commercial}
                </div>
                <MiniKpi
                  label="CA en cours"
                  value={fmtEur(k.ca_societe)}
                  primary
                />
                <MiniKpi
                  label="Projection fin de mois"
                  value={fmtEur(k.projection)}
                />
                <MiniKpi
                  label="CA mandataires"
                  value={fmtEur(k.ca_mandataire)}
                />
                <MiniKpi
                  label="Nb contrats"
                  value={String(k.nb_contrats)}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Mode commercial unique */}
      {selectedKpis && (
        <>
          {/* 4 KPIs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
            }}
          >
            <Kpi
              label={`CA ${MOIS_NOMS[curMonth]}`}
              value={fmtEur(selectedKpis.ca_societe)}
              color={COMM_COLORS[selected] ?? '#0f172a'}
            />
            <Kpi
              label="Projection fin de mois"
              value={fmtEur(selectedKpis.projection)}
              hint={`Sur ${joursDansMois} jours`}
              color="#00C18B"
            />
            <Kpi
              label="CA mandataires"
              value={fmtEur(selectedKpis.ca_mandataire)}
            />
            <Kpi
              label="Nb contrats"
              value={String(selectedKpis.nb_contrats)}
            />
          </div>

          {/* Indicateurs vs objectifs */}
          <Card title={`Objectifs — ${MOIS_NOMS[curMonth]} ${curYear}`}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={trHead}>
                  <th style={th}>Indicateur</th>
                  <th style={{ ...th, textAlign: 'right' }}>Objectif</th>
                  <th style={{ ...th, textAlign: 'right' }}>Réalisé</th>
                  <th style={{ ...th, textAlign: 'right' }}>%</th>
                  <th style={{ ...th, textAlign: 'center', width: 60 }}>
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                <ObjectifRow
                  label={`CA / jour (${joursEcoules}j écoulés)`}
                  objectif={OBJECTIFS.CA_JOUR}
                  realise={selectedKpis.ca_par_jour}
                  format={fmtEur}
                />
                <ObjectifRow
                  label="Panier moyen"
                  objectif={OBJECTIFS.PANIER}
                  realise={selectedKpis.panier_moyen}
                  format={fmtEur}
                />
                <ObjectifRow
                  label="CA moyen par contrat"
                  objectif={OBJECTIFS.CA_MOYEN}
                  realise={selectedKpis.ca_moyen_par_contrat}
                  format={fmtEur}
                />
                <ObjectifRow
                  label="Nb contrats"
                  objectif={OBJECTIFS.CONTRATS}
                  realise={selectedKpis.nb_contrats}
                  format={(n) => String(Math.round(n))}
                />
                <ObjectifRow
                  label="Frais de service"
                  objectif={OBJECTIFS.FRAIS}
                  realise={selectedKpis.frais}
                  format={fmtEur}
                />
              </tbody>
            </table>
          </Card>

          {/* Historique mensuel */}
          <Card title={`Historique — ${selected}`}>
            {historique.length === 0 ? (
              <Empty label="Aucun historique." />
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={trHead}>
                    <th style={th}>Mois</th>
                    <th style={{ ...th, textAlign: 'right' }}>Nb contrats</th>
                    <th style={{ ...th, textAlign: 'right' }}>CA société</th>
                    <th style={{ ...th, textAlign: 'right' }}>
                      CA mandataires
                    </th>
                    <th style={{ ...th, textAlign: 'right' }}>Frais</th>
                  </tr>
                </thead>
                <tbody>
                  {historique.map((r) => (
                    <tr
                      key={`${r.annee}-${r.mois}`}
                      style={{ borderTop: '1px solid #f1f5f9' }}
                    >
                      <td
                        style={{
                          ...td,
                          fontWeight: 600,
                          color: '#0f172a',
                        }}
                      >
                        {fmtMois(r.annee, r.mois)}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: 'right',
                          color: '#94a3b8',
                        }}
                      >
                        {r.nb_contrats}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: 'right',
                          fontFamily:
                            "'JetBrains Mono', ui-monospace, monospace",
                          color: '#0f172a',
                          fontWeight: 600,
                        }}
                      >
                        {fmtEur(r.ca_societe)}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: 'right',
                          fontFamily:
                            "'JetBrains Mono', ui-monospace, monospace",
                          color: '#64748b',
                        }}
                      >
                        {fmtEur(r.ca_mandataire)}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: 'right',
                          fontFamily:
                            "'JetBrains Mono', ui-monospace, monospace",
                          color: '#BA7517',
                        }}
                      >
                        {fmtEur(r.frais)}
                      </td>
                    </tr>
                  ))}
                  <tr
                    style={{
                      background: '#f8fafc',
                      borderTop: '2px solid #cbd5e1',
                      fontWeight: 700,
                    }}
                  >
                    <td style={{ ...td, color: '#0f172a' }}>Total</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      {historique.reduce((s, r) => s + r.nb_contrats, 0)}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        fontFamily:
                          "'JetBrains Mono', ui-monospace, monospace",
                        color: '#00C18B',
                      }}
                    >
                      {fmtEur(historique.reduce((s, r) => s + r.ca_societe, 0))}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        fontFamily:
                          "'JetBrains Mono', ui-monospace, monospace",
                        color: '#64748b',
                      }}
                    >
                      {fmtEur(
                        historique.reduce((s, r) => s + r.ca_mandataire, 0),
                      )}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: 'right',
                        fontFamily:
                          "'JetBrains Mono', ui-monospace, monospace",
                        color: '#BA7517',
                      }}
                    >
                      {fmtEur(historique.reduce((s, r) => s + r.frais, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}

      {/* ── Section 3 : Détail commissions du mois courant ─── */}
      <Card
        title={`Détail commissions — ${MOIS_NOMS[curMonth]} ${curYear}${
          loadingDetail ? ' (chargement…)' : ''
        }`}
      >
        {commissionsMois.length === 0 ? (
          <Empty label="Aucune commission ce mois-ci." />
        ) : (
          <>
            <div
              style={{
                fontSize: 12,
                color: '#64748b',
                marginBottom: 10,
              }}
            >
              Total commissions mandataires :{' '}
              <strong
                style={{
                  color: '#00C18B',
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontSize: 15,
                }}
              >
                {fmtEur(totalMandataireMois)}
              </strong>{' '}
              · {commissionsMois.length} ligne
              {commissionsMois.length > 1 ? 's' : ''}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={trHead}>
                    {selected === 'Tous' && <th style={th}>Commercial</th>}
                    <th style={th}>Client</th>
                    <th style={th}>Compagnie</th>
                    <th style={th}>Origine</th>
                    <th style={th}>Type com.</th>
                    <th style={{ ...th, textAlign: 'right' }}>Com. société</th>
                    <th style={{ ...th, textAlign: 'right' }}>
                      Com. mandataire
                    </th>
                    <th style={{ ...th, textAlign: 'right' }}>Frais</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionsMois.map((r) => {
                    const oc = origineCol(r.origine)
                    const cc = r.commercial_prenom
                      ? COMM_COLORS[r.commercial_prenom] ?? '#64748b'
                      : '#94a3b8'
                    return (
                      <tr
                        key={r.id}
                        style={{ borderTop: '1px solid #f1f5f9' }}
                      >
                        {selected === 'Tous' && (
                          <td
                            style={{
                              ...td,
                              color: cc,
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            {r.commercial_prenom ?? '—'}
                          </td>
                        )}
                        <td
                          style={{
                            ...td,
                            fontWeight: 600,
                            color: '#0f172a',
                          }}
                        >
                          {r.client}
                        </td>
                        <td style={{ ...td, color: '#475569' }}>
                          {r.compagnie_assureur ?? '—'}
                        </td>
                        <td style={td}>
                          {r.origine ? (
                            <span
                              style={{
                                background: `${oc}18`,
                                color: oc,
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {r.origine}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                        <td
                          style={{
                            ...td,
                            color: '#94a3b8',
                            fontSize: 11,
                          }}
                        >
                          {r.type_commission ?? '—'}
                        </td>
                        <td
                          style={{
                            ...td,
                            textAlign: 'right',
                            fontFamily:
                              "'JetBrains Mono', ui-monospace, monospace",
                            color: '#0f172a',
                            fontWeight: 600,
                          }}
                        >
                          {fmtEur(r.montant_com_societe)}
                        </td>
                        <td
                          style={{
                            ...td,
                            textAlign: 'right',
                            fontFamily:
                              "'JetBrains Mono', ui-monospace, monospace",
                            color: '#00C18B',
                            fontWeight: 700,
                          }}
                        >
                          {fmtEur(r.montant_com_mandataire)}
                        </td>
                        <td
                          style={{
                            ...td,
                            textAlign: 'right',
                            fontFamily:
                              "'JetBrains Mono', ui-monospace, monospace",
                            color:
                              r.montant_frais > 0 ? '#BA7517' : '#cbd5e1',
                          }}
                        >
                          {r.montant_frais > 0
                            ? fmtEur(r.montant_frais)
                            : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* ── Section 4 : Bloc informatif instances ─────────── */}
      <Card title="⚠️ Commissions en instance">
        <div
          style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: 8,
            padding: 14,
            fontSize: 13,
            color: '#92400e',
            lineHeight: 1.6,
          }}
        >
          <strong>Attention :</strong> certains contrats peuvent être en
          instance auprès des compagnies (litiges, pièces manquantes,
          dossiers incomplets). Les commissions associées à ces contrats
          ne sont pas versées tant que l'instance n'est pas résolue.
          <div
            style={{ marginTop: 8, fontSize: 12, color: '#78350f' }}
          >
            → Consulter la vue <strong>Instances</strong> dans TessAdmin
            pour le suivi des dossiers en attente.
          </div>
        </div>
      </Card>

      {/* ── Section 5 : Commissions perdues sur rétractations ── */}
      <Card
        title={`Commissions perdues — Rétractations${
          loadingRetracs ? ' (chargement…)' : ''
        }`}
      >
        {retractations.length === 0 ? (
          <div
            style={{
              background: '#dcfce7',
              border: '1px solid #1D9E7530',
              borderRadius: 8,
              padding: 14,
              fontSize: 13,
              color: '#15803d',
              fontWeight: 600,
            }}
          >
            ✓ Aucune rétractation
            {selected !== 'Tous' ? ` pour ${selected}` : ''}.
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: 12,
                color: '#64748b',
                marginBottom: 10,
              }}
            >
              Manque à gagner mandataire estimé :{' '}
              <strong
                style={{
                  color: '#E24B4A',
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  fontSize: 15,
                }}
              >
                −{fmtEur(totalManqueAGagner)}
              </strong>{' '}
              sur {retractations.length} rétractation
              {retractations.length > 1 ? 's' : ''}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={trHead}>
                    {selected === 'Tous' && <th style={th}>Commercial</th>}
                    <th style={th}>Client</th>
                    <th style={th}>Compagnie</th>
                    <th style={th}>Date</th>
                    <th style={{ ...th, textAlign: 'right' }}>Cotisation</th>
                    <th style={th}>Origine</th>
                    <th style={{ ...th, textAlign: 'right' }}>Taux mand.</th>
                    <th style={{ ...th, textAlign: 'right' }}>
                      Manque à gagner
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {retractations.map((r) => {
                    const manque = comMandataireEstimee(r)
                    const oc = origineCol(r.origine)
                    const cc = r.commercial_prenom
                      ? COMM_COLORS[r.commercial_prenom] ?? '#64748b'
                      : '#94a3b8'
                    return (
                      <tr
                        key={r.contrat_id}
                        style={{ borderTop: '1px solid #f1f5f9' }}
                      >
                        {selected === 'Tous' && (
                          <td
                            style={{
                              ...td,
                              color: cc,
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            {r.commercial_prenom ?? '—'}
                          </td>
                        )}
                        <td
                          style={{
                            ...td,
                            fontWeight: 600,
                            color: '#0f172a',
                          }}
                        >
                          {r.client}
                        </td>
                        <td style={{ ...td, color: '#475569' }}>
                          {r.compagnie_assureur ?? '—'}
                        </td>
                        <td
                          style={{
                            ...td,
                            color: '#94a3b8',
                            fontFamily:
                              "'JetBrains Mono', ui-monospace, monospace",
                            fontSize: 11,
                          }}
                        >
                          {r.date_signature
                            ? new Date(r.date_signature).toLocaleDateString(
                                'fr-FR',
                              )
                            : '—'}
                        </td>
                        <td
                          style={{
                            ...td,
                            textAlign: 'right',
                            fontFamily:
                              "'JetBrains Mono', ui-monospace, monospace",
                            color: '#475569',
                          }}
                        >
                          {r.cotisation_mensuelle
                            ? fmtEur(r.cotisation_mensuelle) + '/m'
                            : '—'}
                        </td>
                        <td style={td}>
                          {r.origine ? (
                            <span
                              style={{
                                background: `${oc}18`,
                                color: oc,
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              {r.origine}
                            </span>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                        <td
                          style={{
                            ...td,
                            textAlign: 'right',
                            color: '#64748b',
                            fontSize: 11,
                            fontFamily:
                              "'JetBrains Mono', ui-monospace, monospace",
                          }}
                        >
                          {(r.taux_mandataire * 100).toFixed(0)}%
                        </td>
                        <td
                          style={{
                            ...td,
                            textAlign: 'right',
                            fontFamily:
                              "'JetBrains Mono', ui-monospace, monospace",
                            color: '#E24B4A',
                            fontWeight: 700,
                          }}
                        >
                          {manque > 0 ? `−${fmtEur(manque)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 11,
                color: '#94a3b8',
                fontStyle: 'italic',
              }}
            >
              (*) Estimation basée sur la cotisation mensuelle et les taux
              de commission 1ère année moyens par produit (PA 30/PA 34/PS
              25/LE 20). Le taux mandataire est calculé serveur depuis
              l'origine du lead.
            </div>
          </>
        )}
      </Card>

      {/* Référentiel taux mandataires (toujours visible) */}
      <Card title="Référentiel — Taux mandataires">
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={trHead}>
              <th style={th}>Source</th>
              <th style={{ ...th, textAlign: 'right' }}>Taux</th>
              <th style={th}>Description</th>
            </tr>
          </thead>
          <tbody>
            {REFERENTIEL_TAUX.map((r) => (
              <tr key={r.source} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td
                  style={{
                    ...td,
                    fontWeight: 600,
                    color: '#0f172a',
                  }}
                >
                  {r.source}
                </td>
                <td
                  style={{
                    ...td,
                    textAlign: 'right',
                    color: '#00C18B',
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                >
                  {r.taux}
                </td>
                <td style={{ ...td, color: '#64748b', fontSize: 12 }}>
                  {r.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ── Sub-composants ──────────────────────────────────────────

interface ObjectifRowProps {
  label: string
  objectif: number
  realise: number
  format: (n: number) => string
}

function ObjectifRow({ label, objectif, realise, format }: ObjectifRowProps) {
  const pct = objectif > 0 ? (realise / objectif) * 100 : 0
  const statut = statutCouleur(pct)
  return (
    <tr style={{ borderTop: '1px solid #f1f5f9' }}>
      <td style={{ ...td, fontWeight: 500, color: '#475569' }}>{label}</td>
      <td
        style={{
          ...td,
          textAlign: 'right',
          color: '#94a3b8',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        }}
      >
        {format(objectif)}
      </td>
      <td
        style={{
          ...td,
          textAlign: 'right',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          color: '#0f172a',
          fontWeight: 600,
        }}
      >
        {format(realise)}
      </td>
      <td
        style={{
          ...td,
          textAlign: 'right',
          color: statut.color,
          fontWeight: 700,
        }}
      >
        {pct.toFixed(0)}%
      </td>
      <td style={{ ...td, textAlign: 'center' }}>
        <span
          style={{
            display: 'inline-block',
            background: statut.background,
            color: statut.color,
            width: 22,
            height: 22,
            borderRadius: '50%',
            lineHeight: '22px',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {statut.label}
        </span>
      </td>
    </tr>
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
          fontSize: 24,
          fontWeight: 700,
          margin: '6px 0 2px',
          color: color ?? '#0f172a',
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ color: '#94a3b8', fontSize: 12 }}>{hint}</div>
      )}
    </div>
  )
}

function MiniKpi({
  label,
  value,
  primary,
}: {
  label: string
  value: string
  primary?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        padding: '4px 0',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}
    >
      <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: primary ? 15 : 12,
          fontWeight: primary ? 700 : 600,
          color: primary ? '#00C18B' : '#0f172a',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 18,
      }}
    >
      <h3 style={{ margin: '0 0 14px', fontSize: 14 }}>{title}</h3>
      {children}
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
      {label}
    </div>
  )
}

const trHead: React.CSSProperties = {
  color: '#64748b',
  fontSize: 11,
  fontWeight: 600,
}
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px 8px 0',
  borderBottom: '1px solid #e5e7eb',
}
const td: React.CSSProperties = { padding: '10px 12px 10px 0' }

export default Mandataires
