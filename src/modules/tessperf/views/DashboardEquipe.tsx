import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { hasRole } from '@/shared/types'
import { fetchAllCommerciaux, fetchCurrentUserCommercial } from '../api'
import {
  useMonthlyAllCommerciaux,
} from '../hooks/useMonthlyCommercial'
import { useMonthlyEquipe } from '../hooks/useMonthlyEquipe'
import type { Commercial, MonthlyKpis } from '../types'
import {
  fmtEUR,
  fmtInt,
  fmtPct,
  monthInputFromAnneeMois,
  parseMonthInput,
} from '../utils/format'
import { ObjectifProgress } from '../components/ObjectifProgress'
import { KpiCard } from '../components/KpiCard'
import { TauxConversionGauge } from '../components/TauxConversionGauge'
import { VentilationDonut, colorForIndex } from '../components/VentilationDonut'
import { RatioQualite } from '../components/RatioQualite'
import { SidecarMetric } from '../components/SidecarMetric'
import { CommercialSelector } from '../components/CommercialSelector'

function currentAnneeMois(): { annee: number; mois: number } {
  const n = new Date()
  return { annee: n.getFullYear(), mois: n.getMonth() + 1 }
}

export default function DashboardEquipe() {
  const navigate = useNavigate()
  const { user, role } = useAuth()
  const [{ annee, mois }, setPeriod] = useState(currentAnneeMois)
  const [commerciaux, setCommerciaux] = useState<Commercial[]>([])
  const [redirectChecked, setRedirectChecked] = useState(false)

  // Charge la liste des commerciaux (tous, on filtre productifs côté UI)
  useEffect(() => {
    let cancelled = false
    fetchAllCommerciaux()
      .then((d) => { if (!cancelled) setCommerciaux(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  // Redirection conditionnelle au login : si l'utilisateur connecté est un
  // commercial productif (et pas seulement admin), on l'envoie sur sa fiche.
  useEffect(() => {
    if (redirectChecked || !user?.email) return
    fetchCurrentUserCommercial(user.email)
      .then((c) => {
        setRedirectChecked(true)
        if (!c) return
        // Admin ou superadmin : on respecte qu'il a atterri sur l'équipe.
        if (hasRole(role, 'admin')) return
        // Sinon : commercial productif → redirige sur sa vue.
        if (c.statut === 'actif_productif') {
          navigate(`/tessperf/commercial/${c.id}`, { replace: true })
        }
      })
      .catch(() => setRedirectChecked(true))
  }, [user, role, navigate, redirectChecked])

  const productifs = useMemo(
    () => commerciaux.filter((c) => c.statut === 'actif_productif'),
    [commerciaux],
  )

  const { data: equipe, loading, error } = useMonthlyEquipe(annee, mois)
  const { data: parCommercial } = useMonthlyAllCommerciaux(annee, mois)

  // Garde uniquement les productifs pour le tableau et les ventilations
  const parCommercialProductif = useMemo(
    () => parCommercial.filter((k) => k.commercial_statut === 'actif_productif'),
    [parCommercial],
  )

  const handleMoisChange = (e: ChangeEvent<HTMLInputElement>) => {
    const p = parseMonthInput(e.target.value)
    if (p) setPeriod(p)
  }

  if (loading) return <div style={page}><div style={{ color: '#64748b' }}>Chargement…</div></div>
  if (error) return <div style={page}><div style={{ color: '#dc2626' }}>Erreur : {error}</div></div>
  if (!equipe) {
    return (
      <div style={page}>
        <Header annee={annee} mois={mois} onChange={handleMoisChange} commerciaux={productifs} />
        <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: 32, textAlign: 'center' }}>
          Pas de données pour ce mois.
        </div>
      </div>
    )
  }

  // Ventilations agrégées sur tous les productifs
  const sourceTotals = sumSources(parCommercialProductif)
  const produitTotals = sumProduits(parCommercialProductif)

  return (
    <div style={page}>
      <Header annee={annee} mois={mois} onChange={handleMoisChange} commerciaux={productifs} />

      {/* Zone 1 — Objectif */}
      <ObjectifProgress
        caRealise={Number(equipe.ca_acquisition_productifs)}
        objectifADate={Number(equipe.objectif_ca_a_date)}
        pctObjectifADate={Number(equipe.pct_objectif_a_date)}
        caProjete={Number(equipe.ca_projete_productifs)}
        objectifProjete={Number(equipe.objectif_ca_projete_fin_mois)}
        hint={`Calculé sur ${fmtInt(equipe.nb_leads_total_mapapp)} leads Mapapp × ${fmtPct(Number(equipe.taux_transfo_mapapp_cible) * 100, 0)} × ${fmtEUR(equipe.panier_moyen_cible)} × coef ${equipe.coef_ambition}`}
      />

      {/* Zone 2 — Volume / Conversion */}
      <Section title="Volume & conversion">
        <KpiCard
          label="Leads Mapapp"
          value={fmtInt(equipe.nb_leads_total_mapapp)}
          sublabel={`dont ${fmtInt(equipe.nb_leads_productifs)} productifs / ${fmtInt(equipe.nb_leads_total_mapapp - equipe.nb_leads_productifs)} pioche`}
        />
        <KpiCard
          label="Décrochés productifs"
          value={fmtInt(equipe.nb_decroches_productifs)}
          sublabel={
            equipe.nb_leads_productifs > 0
              ? `${fmtPct((equipe.nb_decroches_productifs / equipe.nb_leads_productifs) * 100)} des leads productifs`
              : '—'
          }
        />
        <TauxConversionGauge
          realise={Number(equipe.taux_conversion_productifs_pct)}
          cible={Number(equipe.taux_transfo_mapapp_cible) * 100}
          signes={Number(equipe.nb_signes_productifs)}
          decroches={Number(equipe.nb_decroches_productifs)}
        />
      </Section>

      {/* Zone 3 — Ventilation */}
      <Section title="Ventilation des contrats signés">
        <VentilationDonut
          title="Par source"
          slices={Object.entries(sourceTotals).map(([k, v], i) => ({
            label: SOURCE_LABELS[k] ?? k,
            value: v,
            color: colorForIndex(i),
          }))}
        />
        <VentilationDonut
          title="Par produit"
          slices={Object.entries(produitTotals).map(([k, v], i) => ({
            label: PRODUIT_LABELS[k] ?? k,
            value: v,
            color: colorForIndex(i),
          }))}
        />
      </Section>

      {/* Zone 4 — Qualité */}
      <Section title="Qualité">
        <RatioQualite
          label="Frais de service"
          realisePct={Number(equipe.ratio_frais_service_realise) * 100}
          ciblePct={Number(equipe.ratio_frais_service_cible) * 100}
          caption={`${fmtInt(equipe.nb_frais_service_productifs)} / ${fmtInt(equipe.nb_mutuelles_productifs)} mutuelles`}
        />
        <RatioQualite
          label="Multi-équipement"
          realisePct={Number(equipe.ratio_multi_equip_realise) * 100}
          ciblePct={Number(equipe.ratio_multi_equip_cible) * 100}
          caption={`${fmtInt(equipe.nb_multi_equip_productifs)} / ${fmtInt(equipe.nb_mutuelles_productifs)} mutuelles`}
        />
        <KpiCard
          label="Avis 5★"
          value="—"
          sublabel="Saisie manuelle à venir"
          hint="Source data non encore branchée"
        />
      </Section>

      {/* Zone 5 — Sidecars */}
      <Section title="Sidecars (observationnel)">
        <SidecarMetric
          label="Instances créées"
          count={Number(equipe.nb_instances_productifs)}
          tauxPct={
            equipe.nb_signes_productifs > 0
              ? (equipe.nb_instances_productifs / equipe.nb_signes_productifs) * 100
              : 0
          }
          note="Pas de pénalité, juste pour suivi."
        />
        <SidecarMetric
          label="Rétractations"
          count={Number(equipe.nb_retractations_productifs)}
          tauxPct={
            equipe.nb_signes_productifs > 0
              ? (equipe.nb_retractations_productifs / equipe.nb_signes_productifs) * 100
              : 0
          }
          note="Parmi les signatures du mois."
        />
      </Section>

      {/* Zone 6 — Footer commercial */}
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
                  <th style={thR}>Leads</th>
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
                {parCommercialProductif.map((c) => (
                  <tr
                    key={c.commercial_id}
                    onClick={() => navigate(`/tessperf/commercial/${c.commercial_id}`)}
                    style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer' }}
                  >
                    <td style={{ ...td, fontWeight: 600 }}>
                      {c.commercial_prenom}
                    </td>
                    <td style={tdNum}>{fmtInt(c.nb_leads_recus)}</td>
                    <td style={tdNum}>{fmtInt(c.nb_decroches)}</td>
                    <td style={tdNum}>{fmtInt(c.nb_contrats_signes)}</td>
                    <td style={tdNum}>{fmtPct(c.taux_conversion_pct)}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: '#0f172a' }}>{fmtEUR(c.ca_acquisition)}</td>
                    <td style={{ ...tdNum, color: '#475569' }}>{fmtEUR(c.ca_projete_fin_mois)}</td>
                    <td style={tdNum}>{fmtInt(c.nb_contrats_mutuelle)}</td>
                    <td style={tdNum}>{fmtInt(c.nb_contrats_multi_equip)}</td>
                    <td style={tdNum}>{fmtInt(c.nb_frais_service)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

function Header({
  annee,
  mois,
  onChange,
  commerciaux,
}: {
  annee: number
  mois: number
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  commerciaux: Commercial[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>TessPerf · Équipe Tessoria</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 13 }}>
            Pilotage de la performance commerciale — taux de conversion, ratios qualité, projections fin de mois.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="month"
            value={monthInputFromAnneeMois(annee, mois)}
            onChange={onChange}
            style={{
              padding: '6px 10px',
              fontSize: 13,
              border: '1px solid #d1d5db',
              borderRadius: 6,
              background: '#f9fafb',
              color: '#0f172a',
            }}
          />
        </div>
      </div>
      {commerciaux.length > 0 && (
        <div>
          <CommercialSelector commerciaux={commerciaux} activeId="equipe" />
        </div>
      )}
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
  frontalier: 'Frontalier',
  autre: 'Autre',
}

function sumSources(rows: MonthlyKpis[]): Record<string, number> {
  return rows.reduce(
    (acc, r) => ({
      mapapp: acc.mapapp + Number(r.nb_contrats_mapapp ?? 0),
      site: acc.site + Number(r.nb_contrats_site ?? 0),
      back_office: acc.back_office + Number(r.nb_contrats_bo ?? 0),
      recommandation: acc.recommandation + Number(r.nb_contrats_reco ?? 0),
      multi_equipement: acc.multi_equipement + Number(r.nb_contrats_multi_equip ?? 0),
    }),
    { mapapp: 0, site: 0, back_office: 0, recommandation: 0, multi_equipement: 0 },
  )
}

function sumProduits(rows: MonthlyKpis[]): Record<string, number> {
  return rows.reduce(
    (acc, r) => ({
      mutuelle: acc.mutuelle + Number(r.nb_contrats_mutuelle ?? 0),
      obseques: acc.obseques + Number(r.nb_contrats_obseques ?? 0),
      prevoyance: acc.prevoyance + Number(r.nb_contrats_prevoyance ?? 0),
      emprunteur: acc.emprunteur + Number(r.nb_contrats_emprunteur ?? 0),
      animal: acc.animal + Number(r.nb_contrats_animal ?? 0),
      autre: acc.autre + Number(r.nb_contrats_autre ?? 0),
    }),
    { mutuelle: 0, obseques: 0, prevoyance: 0, emprunteur: 0, animal: 0, autre: 0 },
  )
}

const page: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
}
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap',
}
const thR: React.CSSProperties = { ...th, textAlign: 'right' }
const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' }
const tdNum: React.CSSProperties = {
  ...td,
  textAlign: 'right',
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  whiteSpace: 'nowrap',
}

