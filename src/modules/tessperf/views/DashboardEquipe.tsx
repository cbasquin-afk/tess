import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  produitCountsFromKpis,
  produitCountsFromOrigine,
  useMonthlyAllCommerciauxHook,
  useMonthlyFilteredEquipe,
} from '../hooks/useMonthlyFiltered'
import TessPerfLayout from '../components/TessPerfLayout'
import { ObjectifProgress } from '../components/ObjectifProgress'
import { KpiCard } from '../components/KpiCard'
import { TauxConversionGauge } from '../components/TauxConversionGauge'
import { VentilationDonut, colorForIndex } from '../components/VentilationDonut'
import { RatioQualite } from '../components/RatioQualite'
import { SidecarMetric } from '../components/SidecarMetric'
import {
  fmtEUR,
  fmtInt,
  fmtPct,
} from '../utils/format'
import type { Commercial, Origine } from '../types'

const SOURCE_LABELS: Record<string, string> = {
  mapapp: 'Mapapp',
  site: 'Site',
  back_office: 'Back-office',
  recommandation: 'Recommandation',
  multi_equipement: 'Multi-équipement',
}
const PRODUIT_LABELS: Record<string, string> = {
  mutuelle: 'Mutuelle',
  obseques: 'Obsèques',
  prevoyance: 'Prévoyance',
  emprunteur: 'Emprunteur',
  animal: 'Animal',
  autre: 'Autre',
}

export default function DashboardEquipe() {
  return (
    <TessPerfLayout section="mensuel" scope="equipe">
      {({ annee, mois, origine, commerciaux }) => (
        <EquipeContent annee={annee} mois={mois} origine={origine} commerciaux={commerciaux} />
      )}
    </TessPerfLayout>
  )
}

function EquipeContent({
  annee,
  mois,
  origine,
  commerciaux,
}: {
  annee: number
  mois: number
  origine: Origine
  commerciaux: Commercial[]
}) {
  const navigate = useNavigate()
  const productifIds = useMemo(() => commerciaux.map((c) => c.id), [commerciaux])
  const { data: filtered, loading, error } = useMonthlyFilteredEquipe(
    annee,
    mois,
    origine,
    productifIds,
  )
  const { data: parCommercial } = useMonthlyAllCommerciauxHook(annee, mois)
  const parCommercialProductif = useMemo(
    () => parCommercial.filter((k) => k.commercial_statut === 'actif_productif'),
    [parCommercial],
  )

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>
  if (!filtered) {
    return (
      <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: 32, textAlign: 'center' }}>
        Pas de données pour ce mois.
      </div>
    )
  }

  const { base, origineData } = filtered
  const origineActive = origine !== 'toutes' && origineData !== null

  // KPIs filtrés lus directement depuis la vue DB (plus d'agrégation front).
  const nbLeads = origineActive
    ? Number(origineData.nb_leads_equipe)
    : Number(base.nb_leads_equipe_tous)
  const nbSignes = origineActive
    ? Number(origineData.nb_signes_productifs)
    : Number(base.nb_signes_productifs)
  const nbDecroches = origineActive
    ? Number(origineData.nb_decroches_productifs)
    : Number(base.nb_decroches_productifs)
  const caProductifs = origineActive
    ? Number(origineData.ca_acquisition_productifs)
    : Number(base.ca_acquisition_productifs)

  // Objectif CA : TOUJOURS sur leads Mapapp global (formule métier).
  const objectifADate = Number(base.objectif_ca_a_date)
  const pctObjectifADate = origineActive
    ? objectifADate > 0
      ? (caProductifs / objectifADate) * 100
      : 0
    : Number(base.pct_objectif_a_date)

  const tauxTransfoCible = Number(base.taux_transfo_mapapp_cible) * 100
  const tauxConversionCible = Number(base.taux_conversion_cible) * 100
  const tauxTransfo = origineActive
    ? Number(origineData.taux_transfo_pct)
    : Number(base.taux_transfo_productifs_pct)
  const tauxConv = origineActive
    ? Number(origineData.taux_conversion_pct)
    : Number(base.taux_conversion_productifs_pct)

  // Ventilation par source : toujours dérivée de la somme MonthlyKpis de tous
  // les commerciaux productifs (footer) — le donut reflète la répartition sur
  // le scope filtré (il y a une ligne par source). Pour un filtre single-source
  // actif, c'est mono-tranche : pas utile, on masque les autres.
  const sourceSlices = (() => {
    if (origineActive) {
      // Une seule source visible : montrer uniquement la tranche active
      const active = origine
      return [{
        label: SOURCE_LABELS[active] ?? active,
        value: nbSignes,
        color: colorForIndex(0),
      }]
    }
    const totals = parCommercialProductif.reduce(
      (acc, r) => ({
        mapapp: acc.mapapp + Number(r.nb_contrats_mapapp ?? 0),
        site: acc.site + Number(r.nb_contrats_site ?? 0),
        back_office: acc.back_office + Number(r.nb_contrats_bo ?? 0),
        recommandation: acc.recommandation + Number(r.nb_contrats_reco ?? 0),
        multi_equipement: acc.multi_equipement + Number(r.nb_contrats_multi_equip ?? 0),
      }),
      { mapapp: 0, site: 0, back_office: 0, recommandation: 0, multi_equipement: 0 },
    )
    return Object.entries(totals).map(([k, v], i) => ({
      label: SOURCE_LABELS[k] ?? k,
      value: v,
      color: colorForIndex(i),
    }))
  })()

  const produitCounts = origineActive
    ? produitCountsFromOrigine(origineData)
    : produitCountsFromKpis(parCommercialProductif)
  const produitSlices = Object.entries(produitCounts).map(([k, v], i) => ({
    label: PRODUIT_LABELS[k] ?? k,
    value: v,
    color: colorForIndex(i),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ObjectifProgress
        caRealise={caProductifs}
        objectifADate={objectifADate}
        pctObjectifADate={pctObjectifADate}
        caProjete={Number(base.ca_projete_productifs)}
        objectifProjete={Number(base.objectif_ca_projete_fin_mois)}
        hint={
          origineActive
            ? `Calculé sur ${fmtInt(base.nb_leads_equipe_mapapp)} leads Mapapp — non filtré par origine`
            : `Calculé sur ${fmtInt(base.nb_leads_equipe_mapapp)} leads Mapapp × ${fmtPct(Number(base.taux_transfo_mapapp_cible) * 100, 0)} × ${fmtEUR(base.panier_moyen_cible)} × coef ${base.coef_ambition}`
        }
      />

      <Section title="Volume & taux">
        <KpiCard
          label={origineActive ? `Leads (${origine})` : 'Leads reçus'}
          value={fmtInt(nbLeads)}
          sublabel={
            origineActive
              ? undefined
              : `dont ${fmtInt(base.nb_leads_equipe_mapapp)} Mapapp`
          }
        />
        <KpiCard
          label="Taux de transfo"
          value={fmtPct(tauxTransfo)}
          sublabel={`${fmtInt(nbSignes)} signés / ${fmtInt(base.nb_leads_equipe_mapapp)} leads Mapapp`}
          hint={`Cible ${fmtPct(tauxTransfoCible, 0)}`}
          feu={feuFrom(tauxTransfo, tauxTransfoCible)}
        />
        <TauxConversionGauge
          realise={tauxConv}
          cible={tauxConversionCible}
          signes={nbSignes}
          decroches={nbDecroches}
        />
      </Section>

      <Section title="Ventilation des contrats signés">
        <VentilationDonut title="Par source" slices={sourceSlices} />
        <VentilationDonut title="Par produit" slices={produitSlices} />
      </Section>

      <Section title="Qualité">
        {origineActive ? (() => {
          const nbFrais = Number(origineData.nb_frais_service)
          const nbMut = Number(origineData.nb_signes_mutuelle)
          const nbMultiEq = Number(
            // pas de colonne dédiée dans par_origine → on retombe sur les KPIs
            // agrégés par commercial, filtrés côté front uniquement sur la
            // source principale.
            parCommercialProductif.reduce(
              (s, r) =>
                s +
                (origine === 'mapapp'
                  ? Number(r.nb_contrats_multi_equip ?? 0)
                  : origine === 'multi_equipement'
                    ? Number(r.nb_contrats_multi_equip ?? 0)
                    : 0),
              0,
            ),
          )
          return (
            <>
              <RatioQualite
                label="Frais de service"
                realisePct={nbMut > 0 ? (nbFrais / nbMut) * 100 : 0}
                ciblePct={Number(base.ratio_frais_service_cible) * 100}
                caption={`${fmtInt(nbFrais)} / ${fmtInt(nbMut)} mutuelles (${origine})`}
              />
              <RatioQualite
                label="Multi-équipement"
                realisePct={nbMut > 0 ? (nbMultiEq / nbMut) * 100 : 0}
                ciblePct={Number(base.ratio_multi_equip_cible) * 100}
                caption={`${fmtInt(nbMultiEq)} / ${fmtInt(nbMut)} mutuelles (${origine})`}
              />
            </>
          )
        })() : (
          <>
            <RatioQualite
              label="Frais de service"
              realisePct={Number(base.ratio_frais_service_realise) * 100}
              ciblePct={Number(base.ratio_frais_service_cible) * 100}
              caption={`${fmtInt(base.nb_frais_service_productifs)} / ${fmtInt(base.nb_mutuelles_productifs)} mutuelles`}
            />
            <RatioQualite
              label="Multi-équipement"
              realisePct={Number(base.ratio_multi_equip_realise) * 100}
              ciblePct={Number(base.ratio_multi_equip_cible) * 100}
              caption={`${fmtInt(base.nb_multi_equip_productifs)} / ${fmtInt(base.nb_mutuelles_productifs)} mutuelles`}
            />
          </>
        )}
        <KpiCard
          label="Avis 5★"
          value="—"
          sublabel="Saisie manuelle à venir"
          hint="Source data non encore branchée"
        />
      </Section>

      <Section title="Sidecars (observationnel)">
        <SidecarMetric
          label="Instances créées"
          count={Number(base.nb_instances_productifs)}
          tauxPct={
            base.nb_signes_productifs > 0
              ? (Number(base.nb_instances_productifs) / Number(base.nb_signes_productifs)) * 100
              : 0
          }
          note="Pas de pénalité, pour suivi."
        />
        <SidecarMetric
          label="Rétractations"
          count={Number(base.nb_retractations_productifs)}
          tauxPct={
            base.nb_signes_productifs > 0
              ? (Number(base.nb_retractations_productifs) / Number(base.nb_signes_productifs)) * 100
              : 0
          }
          note="Parmi les signatures du mois."
        />
      </Section>

      <Section title="Détail par commercial productif">
        {parCommercialProductif.length === 0 ? (
          <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 13, padding: 16, width: '100%' }}>
            Aucun commercial productif n'a de données ce mois.
          </div>
        ) : (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              overflowX: 'auto',
              flex: 1,
              minWidth: '100%',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: '#64748b', fontSize: 11, fontWeight: 600, background: '#f8fafc' }}>
                  <th style={th}>Commercial</th>
                  <th style={thR}>Décrochés</th>
                  <th style={thR}>Signés</th>
                  <th style={thR}>Tx conv</th>
                  <th style={thR}>CA</th>
                  <th style={thR}>Projection</th>
                  <th style={thR}>Mutuelles</th>
                  <th style={thR}>Multi-éq</th>
                  <th style={thR}>Frais</th>
                </tr>
              </thead>
              <tbody>
                {parCommercialProductif.map((c) => {
                  const qs = new URLSearchParams()
                  qs.set('annee', String(annee))
                  qs.set('mois', String(mois))
                  if (origine !== 'toutes') qs.set('origine', origine)
                  const target = `/tessperf/mensuel/commercial/${c.commercial_id}?${qs.toString()}`
                  return (
                    <tr
                      key={c.commercial_id}
                      onClick={() => navigate(target)}
                      style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}
                    >
                      <td style={{ ...td, fontWeight: 600 }}>{c.commercial_prenom}</td>
                      <td style={tdNum}>{fmtInt(c.nb_decroches)}</td>
                      <td style={tdNum}>{fmtInt(c.nb_contrats_signes)}</td>
                      <td style={tdNum}>{fmtPct(c.taux_conversion_pct)}</td>
                      <td style={{ ...tdNum, fontWeight: 700, color: '#0f172a' }}>{fmtEUR(c.ca_acquisition)}</td>
                      <td style={{ ...tdNum, color: '#475569' }}>{fmtEUR(c.ca_projete_fin_mois)}</td>
                      <td style={tdNum}>{fmtInt(c.nb_contrats_mutuelle)}</td>
                      <td style={tdNum}>{fmtInt(c.nb_contrats_multi_equip)}</td>
                      <td style={tdNum}>{fmtInt(c.nb_frais_service)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#0f172a',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function feuFrom(realise: number, cible: number): 'vert' | 'orange' | 'rouge' | 'neutre' {
  if (cible <= 0) return 'neutre'
  const r = realise / cible
  if (r >= 0.85) return 'vert'
  if (r >= 0.5) return 'orange'
  return 'rouge'
}

const th: React.CSSProperties = {
  textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap',
}
const thR: React.CSSProperties = { ...th, textAlign: 'right' }
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' }
const tdNum: React.CSSProperties = {
  ...td,
  textAlign: 'right',
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  whiteSpace: 'nowrap',
}
