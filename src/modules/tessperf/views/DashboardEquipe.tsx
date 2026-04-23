import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
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

  const { base } = filtered
  const origineActive = origine !== 'toutes'

  const nbLeads = origineActive ? filtered.nb_leads_filtre : Number(base.nb_leads_equipe_tous)
  const nbSignes = origineActive
    ? filtered.nb_signes_productifs_filtre
    : Number(base.nb_signes_productifs)
  const nbDecroches = origineActive
    ? filtered.nb_decroches_productifs_filtre
    : Number(base.nb_decroches_productifs)

  const tauxTransfoCible = Number(base.taux_transfo_mapapp_cible) * 100
  const tauxConversionCible = Number(base.taux_conversion_cible) * 100
  const tauxTransfo = origineActive
    ? filtered.taux_transfo_filtre_pct
    : Number(base.taux_transfo_productifs_pct)
  const tauxConv = origineActive
    ? filtered.taux_conversion_filtre_pct
    : Number(base.taux_conversion_productifs_pct)

  const sourceSlices = Object.entries(filtered.source_counts).map(([k, v], i) => ({
    label: SOURCE_LABELS[k] ?? k,
    value: v,
    color: colorForIndex(i),
  }))
  const produitSlices = Object.entries(filtered.produit_counts).map(([k, v], i) => ({
    label: PRODUIT_LABELS[k] ?? k,
    value: v,
    color: colorForIndex(i),
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <ObjectifProgress
        caRealise={Number(base.ca_acquisition_productifs)}
        objectifADate={Number(base.objectif_ca_a_date)}
        pctObjectifADate={Number(base.pct_objectif_a_date)}
        caProjete={Number(base.ca_projete_productifs)}
        objectifProjete={Number(base.objectif_ca_projete_fin_mois)}
        hint={`Calculé sur ${fmtInt(base.nb_leads_equipe_mapapp)} leads Mapapp × ${fmtPct(Number(base.taux_transfo_mapapp_cible) * 100, 0)} × ${fmtEUR(base.panier_moyen_cible)} × coef ${base.coef_ambition}${origineActive ? ' — non filtré par origine' : ''}`}
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
