import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { hasRole } from '@/shared/types'
import {
  fetchAllCommerciaux,
  fetchCurrentUserCommercial,
} from '../api'
import type { Commercial, Origine } from '../types'
import { isOrigine } from '../types'
import {
  monthInputFromAnneeMois,
  parseMonthInput,
} from '../utils/format'
import { SubNav } from './SubNav'
import { OrigineFilter } from './OrigineFilter'
import { CommercialSelector } from './CommercialSelector'

interface RenderCtx {
  annee: number
  mois: number
  origine: Origine
  commerciaux: Commercial[]
  activeCommercialId: string | null // null quand "Équipe" sélectionné
}

interface Props {
  /** "mensuel" | "hebdomadaire" — décrit l'onglet courant pour piloter l'URL. */
  section: 'mensuel' | 'hebdomadaire'
  /** "equipe" | "commercial" — détermine si :id est utilisé. */
  scope: 'equipe' | 'commercial'
  /** Rendu du contenu principal, reçoit le contexte courant. */
  children: (ctx: RenderCtx) => ReactNode
}

function currentAnneeMois(): { annee: number; mois: number } {
  const n = new Date()
  return { annee: n.getFullYear(), mois: n.getMonth() + 1 }
}

export default function TessPerfLayout({ section, scope, children }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role } = useAuth()
  const params = useParams<{ id?: string }>()
  const [search, setSearch] = useSearchParams()

  // Période : lue depuis l'URL, sinon mois en cours.
  const period = (() => {
    const a = Number(search.get('annee'))
    const m = Number(search.get('mois'))
    if (Number.isFinite(a) && Number.isFinite(m) && m >= 1 && m <= 12) {
      return { annee: a, mois: m }
    }
    return currentAnneeMois()
  })()
  const { annee, mois } = period

  // Origine : lue depuis l'URL, sinon "toutes".
  const origineRaw = search.get('origine') ?? 'toutes'
  const origine: Origine = isOrigine(origineRaw) ? origineRaw : 'toutes'

  // Commerciaux productifs
  const [commerciaux, setCommerciaux] = useState<Commercial[]>([])
  const [accessChecked, setAccessChecked] = useState(false)
  const [accessAllowed, setAccessAllowed] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchAllCommerciaux()
      .then((d) => { if (!cancelled) setCommerciaux(d) })
      .catch(() => { /* silent */ })
    return () => { cancelled = true }
  }, [])

  // Redirection automatique commercial productif non-admin → sa fiche.
  useEffect(() => {
    if (!user?.email) return
    if (scope !== 'equipe') return
    if (hasRole(role, 'admin')) return // admin reste libre sur l'équipe
    fetchCurrentUserCommercial(user.email).then((c) => {
      if (!c) return
      if (c.statut === 'actif_productif') {
        const qs = new URLSearchParams()
        if (search.get('annee')) qs.set('annee', search.get('annee')!)
        if (search.get('mois')) qs.set('mois', search.get('mois')!)
        if (search.get('origine')) qs.set('origine', search.get('origine')!)
        const suffix = qs.toString() ? `?${qs.toString()}` : ''
        navigate(`/tessperf/${section}/commercial/${c.id}${suffix}`, { replace: true })
      }
    })
  }, [user, role, scope, section, navigate, search])

  // Vérif accès vue commercial
  useEffect(() => {
    if (scope !== 'commercial') {
      setAccessChecked(true)
      setAccessAllowed(true)
      return
    }
    if (!params.id || !user?.email) return
    if (hasRole(role, 'admin')) {
      setAccessAllowed(true)
      setAccessChecked(true)
      return
    }
    fetchCurrentUserCommercial(user.email)
      .then((c) => {
        setAccessAllowed(!!c && c.id === params.id)
        setAccessChecked(true)
      })
      .catch(() => setAccessChecked(true))
  }, [scope, params.id, user, role])

  const productifs = useMemo(
    () => commerciaux.filter((c) => c.statut === 'actif_productif'),
    [commerciaux],
  )

  const activeCommercialId = scope === 'commercial' ? params.id ?? null : null

  function patchSearch(next: Record<string, string | null>) {
    const clone = new URLSearchParams(search)
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') clone.delete(k)
      else clone.set(k, v)
    }
    setSearch(clone, { replace: true })
  }

  function onMoisChange(e: ChangeEvent<HTMLInputElement>) {
    const p = parseMonthInput(e.target.value)
    if (!p) return
    patchSearch({ annee: String(p.annee), mois: String(p.mois) })
  }

  function onOrigineChange(o: Origine) {
    patchSearch({ origine: o === 'toutes' ? null : o })
  }

  // Accès refusé
  if (scope === 'commercial' && accessChecked && !accessAllowed) {
    return (
      <div style={{ padding: 32, color: '#dc2626' }}>
        Accès refusé : vous ne pouvez consulter que votre propre dashboard.
      </div>
    )
  }

  const isAdmin = hasRole(role, 'admin')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header : titre + sélecteur de mois */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>TessPerf</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 13 }}>
            Pilotage de la performance commerciale — taux de conversion, ratios qualité, projections.
          </p>
        </div>
        <input
          type="month"
          value={monthInputFromAnneeMois(annee, mois)}
          onChange={onMoisChange}
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

      {/* Layout 2 colonnes : SubNav gauche + contenu */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <SubNav />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Toolbar : sélecteur commercial + filtre origine */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            {isAdmin && productifs.length > 0 && (
              <CommercialSelector
                commerciaux={productifs}
                activeId={activeCommercialId ?? 'equipe'}
                section={section}
                location={location}
              />
            )}
            <OrigineFilter value={origine} onChange={onOrigineChange} />
          </div>

          {/* Contenu injecté */}
          {children({
            annee,
            mois,
            origine,
            commerciaux: productifs,
            activeCommercialId,
          })}
        </div>
      </div>
    </div>
  )
}
