import { useEffect, useState } from 'react'
import { fetchParametres } from '../api'
import { useMonthlyFilteredCommercial } from '../hooks/useMonthlyFiltered'
import TessPerfLayout from '../components/TessPerfLayout'
import { ContratsDetailDrawer } from '../components/ContratsDetailDrawer'
import { KpiCard } from '../components/KpiCard'
import { TauxConversionGauge } from '../components/TauxConversionGauge'
import { VentilationDonut, colorForIndex } from '../components/VentilationDonut'
import { RatioQualite } from '../components/RatioQualite'
import { SidecarMetric } from '../components/SidecarMetric'
import { fmtEUR, fmtEURDecimal, fmtInt } from '../utils/format'
import type { Commercial, Origine, PerfParametres } from '../types'

const SOURCE_LABELS: Record<string, string> = {
  mapapp: 'Mapapp',
  site: 'Site',
  back_office: 'Back-office',
  recommandation: 'Recommandation',
  multi_equipement: 'Multi-équipement',
}

export default function DashboardCommercial() {
  return (
    <TessPerfLayout section="mensuel" scope="commercial">
      {({ annee, mois, origine, commerciaux, activeCommercialId }) =>
        activeCommercialId ? (
          <CommercialContent
            id={activeCommercialId}
            annee={annee}
            mois={mois}
            origine={origine}
            commerciaux={commerciaux}
          />
        ) : null
      }
    </TessPerfLayout>
  )
}

function CommercialContent({
  id,
  annee,
  mois,
  origine,
  commerciaux,
}: {
  id: string
  annee: number
  mois: number
  origine: Origine
  commerciaux: Commercial[]
}) {
  const { data: filtered, loading, error } = useMonthlyFilteredCommercial(id, annee, mois, origine)
  const [parametres, setParametres] = useState<PerfParametres | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchParametres().then((p) => { if (!cancelled) setParametres(p) }).catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

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
  const prenom =
    base.commercial_prenom ??
    commerciaux.find((c) => c.id === id)?.prenom ??
    '—'

  const nbSignes = origineActive
    ? Number(origineData.nb_contrats_signes)
    : Number(base.nb_contrats_signes)
  const nbDecroches = origineActive
    ? Number(origineData.nb_decroches)
    : Number(base.nb_decroches)
  const caAcq = origineActive
    ? Number(origineData.ca_acquisition)
    : Number(base.ca_acquisition)
  const tauxConv = origineActive
    ? Number(origineData.taux_conversion_pct)
    : Number(base.taux_conversion_pct)
  const tauxConvCible = 25

  // Ventilation source : mono-tranche quand filtre actif, sinon les 5 sources
  // issues de la base MonthlyKpis.
  const sourceSlices = origineActive
    ? [{
        label: SOURCE_LABELS[origine] ?? origine,
        value: nbSignes,
        color: colorForIndex(0),
      }]
    : [
        { label: 'Mapapp', value: Number(base.nb_contrats_mapapp ?? 0), color: colorForIndex(0) },
        { label: 'Site', value: Number(base.nb_contrats_site ?? 0), color: colorForIndex(1) },
        { label: 'Back-office', value: Number(base.nb_contrats_bo ?? 0), color: colorForIndex(2) },
        { label: 'Recommandation', value: Number(base.nb_contrats_reco ?? 0), color: colorForIndex(3) },
        { label: 'Multi-équipement', value: Number(base.nb_contrats_multi_equip ?? 0), color: colorForIndex(4) },
      ]

  // Ventilation produit : la vue par_origine_commercial n'a que
  // nb_contrats_mutuelle. Pour éviter une ventilation fausse, quand un filtre
  // est actif et qu'on n'a que "mutuelle", on montre juste mutuelle + autre.
  const produitSlices = origineActive
    ? [
        { label: 'Mutuelle', value: Number(origineData.nb_contrats_mutuelle ?? 0), color: colorForIndex(0) },
        {
          label: 'Autre',
          value: Math.max(0, nbSignes - Number(origineData.nb_contrats_mutuelle ?? 0)),
          color: colorForIndex(5),
        },
      ]
    : [
        { label: 'Mutuelle', value: Number(base.nb_contrats_mutuelle ?? 0), color: colorForIndex(0) },
        { label: 'Obsèques', value: Number(base.nb_contrats_obseques ?? 0), color: colorForIndex(1) },
        { label: 'Prévoyance', value: Number(base.nb_contrats_prevoyance ?? 0), color: colorForIndex(2) },
        { label: 'Emprunteur', value: Number(base.nb_contrats_emprunteur ?? 0), color: colorForIndex(3) },
        { label: 'Animal', value: Number(base.nb_contrats_animal ?? 0), color: colorForIndex(4) },
        { label: 'Autre', value: Number(base.nb_contrats_autre ?? 0), color: colorForIndex(5) },
      ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Zone 1 — CA cliquable */}
      <div
        onClick={() => setDrawerOpen(true)}
        style={{
          cursor: 'pointer',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
        title="Voir le détail des contrats signés"
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          CA acquisition — {prenom}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 40,
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1,
              textDecoration: 'underline',
              textDecorationColor: '#cbd5e1',
              textDecorationThickness: 2,
              textUnderlineOffset: 6,
            }}
          >
            {fmtEUR(caAcq)}
          </div>
          <div style={{ fontSize: 13, color: '#475569' }}>
            · {fmtInt(nbSignes)} contrat{nbSignes > 1 ? 's' : ''} signé{nbSignes > 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>
            Projection : {fmtEUR(base.ca_projete_fin_mois)} · cliquez pour le détail ↗
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          CA moyen par contrat : {fmtEUR(base.ca_moyen_par_contrat)} (repère {fmtEUR(parametres?.ca_par_contrat_repere ?? 300)})
        </div>
      </div>

      {/* Zone 2 — Activité (décrochés / signés / tx conv). Pas de leads. */}
      <Section title="Activité">
        <KpiCard
          label="Décrochés"
          value={fmtInt(nbDecroches)}
          sublabel="leads décrochés attribués ce mois"
        />
        <KpiCard
          label="Signés"
          value={fmtInt(nbSignes)}
          sublabel={`${fmtInt(base.nb_contrats_mapapp)} Mapapp · ${fmtInt(base.nb_contrats_reco)} reco · ${fmtInt(base.nb_contrats_site)} site`}
        />
        <TauxConversionGauge
          realise={tauxConv}
          cible={tauxConvCible}
          signes={nbSignes}
          decroches={nbDecroches}
        />
      </Section>

      {/* Zone 3 — Ventilation */}
      <Section title="Ventilation des contrats signés">
        <VentilationDonut title="Par source" slices={sourceSlices} />
        <VentilationDonut title="Par produit" slices={produitSlices} />
      </Section>

      {/* Zone 4 — Qualité individuelle */}
      <Section title="Qualité">
        {origineActive ? (() => {
          const nbFrais = Number(origineData.nb_frais_service)
          const nbMut = Number(origineData.nb_contrats_mutuelle)
          return (
            <>
              <RatioQualite
                label="Frais de service"
                realisePct={nbMut > 0 ? (nbFrais / nbMut) * 100 : 0}
                ciblePct={(parametres?.ratio_frais_service_cible ?? 0.3333) * 100}
                caption={`${fmtInt(nbFrais)} / ${fmtInt(nbMut)} mutuelles (${origine})`}
                valueExtra={`Total perçu : ${fmtEURDecimal(origineData.total_frais_service)}`}
              />
              <RatioQualite
                label="Multi-équipement"
                realisePct={Number(base.ratio_multi_equip_realise) * 100}
                ciblePct={(parametres?.ratio_multi_equip_cible ?? 0.2) * 100}
                caption="Non filtré par origine"
              />
            </>
          )
        })() : (
          <>
            <RatioQualite
              label="Frais de service"
              realisePct={Number(base.ratio_frais_service_realise) * 100}
              ciblePct={(parametres?.ratio_frais_service_cible ?? 0.3333) * 100}
              caption={`${fmtInt(base.nb_frais_service)} / ${fmtInt(base.nb_contrats_mutuelle)} mutuelles`}
              valueExtra={`Total perçu : ${fmtEURDecimal(base.total_frais_service)}`}
            />
            <RatioQualite
              label="Multi-équipement"
              realisePct={Number(base.ratio_multi_equip_realise) * 100}
              ciblePct={(parametres?.ratio_multi_equip_cible ?? 0.2) * 100}
              caption={`${fmtInt(base.nb_contrats_multi_equip)} / ${fmtInt(base.nb_contrats_mutuelle)} mutuelles`}
            />
          </>
        )}
        <KpiCard
          label="Panier moyen"
          value={fmtEUR(base.panier_moyen_cotisation)}
          sublabel={`Repère : ${fmtEUR(parametres?.panier_moyen_repere ?? 100)}`}
        />
      </Section>

      {/* Zone 5 — Sidecars */}
      <Section title="Sidecars (observationnel)">
        <SidecarMetric
          label="Instances créées"
          count={Number(base.nb_instances_creees)}
          tauxPct={Number(base.taux_instance_pct)}
          note="Pas de pénalité, pour suivi."
        />
        <SidecarMetric
          label="Rétractations"
          count={Number(base.nb_retractations)}
          tauxPct={Number(base.taux_retractation_pct)}
          note="Parmi les signatures du mois."
        />
      </Section>

      <ContratsDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        commercialId={id}
        commercialPrenom={prenom}
        annee={annee}
        mois={mois}
      />
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
