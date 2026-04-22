import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { hasRole } from '@/shared/types'
import { fetchAllCommerciaux, fetchCurrentUserCommercial, fetchParametres } from '../api'
import { useMonthlyCommercial } from '../hooks/useMonthlyCommercial'
import type { Commercial, PerfParametres } from '../types'
import {
  fmtEUR,
  fmtEURDecimal,
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
import { PeriodSwitch, type Period } from '../components/PeriodSwitch'
import { WeekDrilldown } from '../components/WeekDrilldown'

function currentAnneeMois(): { annee: number; mois: number } {
  const n = new Date()
  return { annee: n.getFullYear(), mois: n.getMonth() + 1 }
}

// Lundi de la semaine ISO contenant `date`
function lundiOf(d: Date): string {
  const x = new Date(d)
  const dow = (x.getDay() + 6) % 7 // 0 = lundi
  x.setDate(x.getDate() - dow)
  return x.toISOString().slice(0, 10)
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function DashboardCommercial() {
  const { id } = useParams<{ id: string }>()
  const { user, role } = useAuth()
  const [{ annee, mois }, setPeriod] = useState(currentAnneeMois)
  const [period, setActivePeriod] = useState<Period>('mois')
  const [commerciaux, setCommerciaux] = useState<Commercial[]>([])
  const [parametres, setParametres] = useState<PerfParametres | null>(null)
  const [accessChecked, setAccessChecked] = useState(false)
  const [accessAllowed, setAccessAllowed] = useState(false)

  // Charge la liste des commerciaux + paramètres
  useEffect(() => {
    let cancelled = false
    Promise.all([fetchAllCommerciaux(), fetchParametres()])
      .then(([cs, p]) => {
        if (cancelled) return
        setCommerciaux(cs)
        setParametres(p)
      })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  // Contrôle d'accès : admin OU commercial dont id correspond
  useEffect(() => {
    if (!id || !user?.email) return
    if (hasRole(role, 'admin')) {
      setAccessAllowed(true)
      setAccessChecked(true)
      return
    }
    fetchCurrentUserCommercial(user.email)
      .then((c) => {
        setAccessAllowed(!!c && c.id === id)
        setAccessChecked(true)
      })
      .catch(() => setAccessChecked(true))
  }, [id, user, role])

  const { data, loading, error } = useMonthlyCommercial(id ?? '', annee, mois)

  const productifs = useMemo(
    () => commerciaux.filter((c) => c.statut === 'actif_productif'),
    [commerciaux],
  )

  const handleMoisChange = (e: ChangeEvent<HTMLInputElement>) => {
    const p = parseMonthInput(e.target.value)
    if (p) setPeriod(p)
  }

  const semaineDebut = useMemo(() => lundiOf(new Date()), [])
  const precSemaineDebut = useMemo(() => addDays(semaineDebut, -7), [semaineDebut])

  if (!id) return <div style={page}>Identifiant commercial manquant.</div>

  if (!accessChecked) {
    return <div style={page}><div style={{ color: '#64748b' }}>Vérification de l'accès…</div></div>
  }

  if (!accessAllowed) {
    return (
      <div style={page}>
        <div style={{ padding: 24, color: '#dc2626' }}>
          Accès refusé : vous ne pouvez consulter que votre propre dashboard.
        </div>
      </div>
    )
  }

  if (loading) return <div style={page}><div style={{ color: '#64748b' }}>Chargement…</div></div>
  if (error) return <div style={page}><div style={{ color: '#dc2626' }}>Erreur : {error}</div></div>

  const isAdmin = hasRole(role, 'admin')
  const prenom = data?.commercial_prenom ?? productifs.find((c) => c.id === id)?.prenom ?? '—'

  if (!data) {
    return (
      <div style={page}>
        <Header
          prenom={prenom}
          annee={annee}
          mois={mois}
          onChange={handleMoisChange}
          commerciaux={productifs}
          activeId={id}
          isAdmin={isAdmin}
          period={period}
          onPeriodChange={setActivePeriod}
        />
        <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: 32, textAlign: 'center' }}>
          Pas de données pour ce mois.
        </div>
      </div>
    )
  }

  const tauxTransfoCible = (parametres?.taux_transfo_mapapp_cible ?? 0.13) * 100

  // Objectif individuel = leads productifs reçus × taux transfo cible × panier moyen × coef
  const objectifADate =
    Number(data.nb_leads_recus) *
    (parametres?.taux_transfo_mapapp_cible ?? 0.13) *
    (parametres?.panier_moyen_cible ?? 315) *
    (parametres?.coef_ambition ?? 1)
  const objectifProjete =
    Number(data.nb_leads_total_mapapp ?? data.nb_leads_recus) *
    (data.jours_ouvres_total > 0
      ? data.jours_ouvres_total / Math.max(1, data.jours_ouvres_ecoules)
      : 1) *
    (parametres?.taux_transfo_mapapp_cible ?? 0.13) *
    (parametres?.panier_moyen_cible ?? 315) *
    (parametres?.coef_ambition ?? 1)
  const pctObjectifADate =
    objectifADate > 0 ? (Number(data.ca_acquisition) / objectifADate) * 100 : 0

  const sourceData = [
    { key: 'mapapp', value: Number(data.nb_contrats_mapapp) },
    { key: 'site', value: Number(data.nb_contrats_site) },
    { key: 'back_office', value: Number(data.nb_contrats_bo) },
    { key: 'recommandation', value: Number(data.nb_contrats_reco) },
    { key: 'multi_equipement', value: Number(data.nb_contrats_multi_equip) },
  ]
  const produitData = [
    { key: 'mutuelle', value: Number(data.nb_contrats_mutuelle) },
    { key: 'obseques', value: Number(data.nb_contrats_obseques) },
    { key: 'prevoyance', value: Number(data.nb_contrats_prevoyance) },
    { key: 'emprunteur', value: Number(data.nb_contrats_emprunteur) },
    { key: 'animal', value: Number(data.nb_contrats_animal) },
    { key: 'autre', value: Number(data.nb_contrats_autre) },
  ]

  const tauxDecroche =
    data.nb_leads_recus > 0
      ? (data.nb_decroches / data.nb_leads_recus) * 100
      : 0

  return (
    <div style={page}>
      <Header
        prenom={prenom}
        annee={annee}
        mois={mois}
        onChange={handleMoisChange}
        commerciaux={productifs}
        activeId={id}
        isAdmin={isAdmin}
        period={period}
        onPeriodChange={setActivePeriod}
      />

      {period === 'mois' && (
        <>
          {/* Zone 1 — Objectif */}
          <ObjectifProgress
            caRealise={Number(data.ca_acquisition)}
            objectifADate={objectifADate}
            pctObjectifADate={pctObjectifADate}
            caProjete={Number(data.ca_projete_fin_mois)}
            objectifProjete={objectifProjete}
            hint={`Calculé sur ${fmtInt(data.nb_leads_recus)} leads reçus × ${fmtPct(tauxTransfoCible, 0)} × ${fmtEUR(parametres?.panier_moyen_cible ?? 315)} × coef ${parametres?.coef_ambition ?? 1}`}
          />

          {/* Zone 2 — Volume */}
          <Section title="Volume & conversion">
            <KpiCard
              label="Leads reçus"
              value={fmtInt(data.nb_leads_recus)}
              sublabel="leads attribués sur le mois"
            />
            <KpiCard
              label="Décrochés"
              value={fmtInt(data.nb_decroches)}
              sublabel={`${fmtPct(tauxDecroche)} des leads`}
            />
            <TauxConversionGauge
              realise={Number(data.taux_conversion_pct)}
              cible={tauxTransfoCible}
              signes={Number(data.nb_contrats_signes)}
              decroches={Number(data.nb_decroches)}
            />
          </Section>

          {/* Zone 3 — Ventilation */}
          <Section title="Ventilation des contrats signés">
            <VentilationDonut
              title="Par source"
              slices={sourceData.map((s, i) => ({
                label: SOURCE_LABELS[s.key] ?? s.key,
                value: s.value,
                color: colorForIndex(i),
              }))}
            />
            <VentilationDonut
              title="Par produit"
              slices={produitData.map((p, i) => ({
                label: PRODUIT_LABELS[p.key] ?? p.key,
                value: p.value,
                color: colorForIndex(i),
              }))}
            />
          </Section>

          {/* Zone 4 — Qualité */}
          <Section title="Qualité">
            <RatioQualite
              label="Frais de service"
              realisePct={Number(data.ratio_frais_service_realise) * 100}
              ciblePct={(parametres?.ratio_frais_service_cible ?? 0.3333) * 100}
              caption={`${fmtInt(data.nb_frais_service)} / ${fmtInt(data.nb_contrats_mutuelle)} mutuelles`}
              valueExtra={`Total perçu : ${fmtEURDecimal(data.total_frais_service)}`}
            />
            <RatioQualite
              label="Multi-équipement"
              realisePct={Number(data.ratio_multi_equip_realise) * 100}
              ciblePct={(parametres?.ratio_multi_equip_cible ?? 0.2) * 100}
              caption={`${fmtInt(data.nb_contrats_multi_equip)} / ${fmtInt(data.nb_contrats_mutuelle)} mutuelles`}
            />
            <KpiCard
              label="Avis 5★"
              value="—"
              sublabel="Saisie manuelle à venir"
            />
          </Section>

          {/* Zone 5 — Sidecars */}
          <Section title="Sidecars (observationnel)">
            <SidecarMetric
              label="Instances créées"
              count={Number(data.nb_instances_creees)}
              tauxPct={Number(data.taux_instance_pct)}
              note="Pas de pénalité, pour suivi."
            />
            <SidecarMetric
              label="Rétractations"
              count={Number(data.nb_retractations)}
              tauxPct={Number(data.taux_retractation_pct)}
              note="Parmi les signatures du mois."
            />
          </Section>

          {/* Zone 6 — Points de repère */}
          <Section title="Points de repère">
            <KpiCard
              label="Panier moyen cotisation"
              value={fmtEUR(data.panier_moyen_cotisation)}
              sublabel={`Repère : ${fmtEUR(parametres?.panier_moyen_repere ?? 100)}`}
            />
            <KpiCard
              label="CA moyen par contrat"
              value={fmtEUR(data.ca_moyen_par_contrat)}
              sublabel={`Repère : ${fmtEUR(parametres?.ca_par_contrat_repere ?? 300)}`}
            />
            <KpiCard
              label="CA total société"
              value={fmtEUR(data.ca_total_societe)}
              sublabel="Acquisition + récurrent estimés"
            />
          </Section>
        </>
      )}

      {period === 'semaine' && (
        <WeekDrilldown
          commercialId={id}
          semaineDebut={semaineDebut}
          precSemaineDebut={precSemaineDebut}
        />
      )}
    </div>
  )
}

function Header({
  prenom,
  annee,
  mois,
  onChange,
  commerciaux,
  activeId,
  isAdmin,
  period,
  onPeriodChange,
}: {
  prenom: string
  annee: number
  mois: number
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  commerciaux: Commercial[]
  activeId: string
  isAdmin: boolean
  period: Period
  onPeriodChange: (p: Period) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {isAdmin && (
        <Link
          to="/tessperf"
          style={{
            fontSize: 12,
            color: '#64748b',
            textDecoration: 'none',
          }}
        >
          ← Vue équipe
        </Link>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>TessPerf · {prenom}</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 13 }}>
            Pilotage individuel — taux de conversion, ratios qualité, projection.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PeriodSwitch value={period} onChange={onPeriodChange} />
          {period === 'mois' && (
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
          )}
        </div>
      </div>
      {commerciaux.length > 0 && isAdmin && (
        <div>
          <CommercialSelector commerciaux={commerciaux} activeId={activeId} />
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

const page: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
}
