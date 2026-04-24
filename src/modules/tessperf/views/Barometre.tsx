import { useEffect, useState } from 'react'
import TessPerfLayout from '../components/TessPerfLayout'
import {
  fetchBarometreHebdoCommercial,
  fetchBarometreHebdoEquipe,
  fetchBarometreMensuelCommercial,
  fetchBarometreMensuelEquipe,
} from '../api'
import {
  buildBarometreHebdoCommercial,
  buildBarometreHebdoEquipe,
  buildBarometreMensuelCommercial,
  buildBarometreMensuelEquipe,
} from '../utils/barometre'
import type {
  BarometreData,
  Constat,
  Suggestion,
} from '../types'
import { fmtEUR, fmtPct } from '../utils/format'

type Periode = 'mensuel' | 'hebdomadaire'

function BarometreEquipe() {
  return (
    <TessPerfLayout section="barometre" scope="equipe">
      {({ annee, mois }) => <Content scope="equipe" annee={annee} mois={mois} />}
    </TessPerfLayout>
  )
}

function BarometreCommercial() {
  return (
    <TessPerfLayout section="barometre" scope="commercial">
      {({ annee, mois, activeCommercialId }) =>
        activeCommercialId ? (
          <Content
            scope="commercial"
            annee={annee}
            mois={mois}
            commercialId={activeCommercialId}
          />
        ) : null
      }
    </TessPerfLayout>
  )
}

function Content({
  scope,
  annee,
  mois,
  commercialId,
}: {
  scope: 'equipe' | 'commercial'
  annee: number
  mois: number
  commercialId?: string
}) {
  const [periode, setPeriode] = useState<Periode>('mensuel')
  const [data, setData] = useState<BarometreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const run = async (): Promise<BarometreData | null> => {
      if (periode === 'mensuel' && scope === 'equipe') {
        const d = await fetchBarometreMensuelEquipe(annee, mois)
        return d ? buildBarometreMensuelEquipe(d) : null
      }
      if (periode === 'mensuel' && scope === 'commercial' && commercialId) {
        const d = await fetchBarometreMensuelCommercial(commercialId, annee, mois)
        return d ? buildBarometreMensuelCommercial(d) : null
      }
      if (periode === 'hebdomadaire' && scope === 'equipe') {
        const d = await fetchBarometreHebdoEquipe()
        return d ? buildBarometreHebdoEquipe(d) : null
      }
      if (periode === 'hebdomadaire' && scope === 'commercial' && commercialId) {
        const d = await fetchBarometreHebdoCommercial(commercialId)
        return d ? buildBarometreHebdoCommercial(d) : null
      }
      return null
    }

    run()
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [periode, scope, annee, mois, commercialId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toggle Mensuel / Hebdomadaire */}
      <div
        style={{
          display: 'inline-flex',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          overflow: 'hidden',
          width: 'fit-content',
        }}
      >
        {(['mensuel', 'hebdomadaire'] as const).map((p) => {
          const active = periode === p
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPeriode(p)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: active ? '#1f3a8a' : '#fff',
                color: active ? '#fff' : '#64748b',
                textTransform: 'capitalize',
              }}
            >
              {p}
            </button>
          )
        })}
      </div>

      {loading && <div style={{ color: '#64748b' }}>Chargement du baromètre…</div>}
      {error && <div style={{ color: '#dc2626' }}>Erreur : {error}</div>}
      {!loading && !error && !data && (
        <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: 24 }}>
          Pas de données pour cette période.
        </div>
      )}

      {data && (
        <>
          <Header data={data} />
          {data.tendance_ca && <TendanceBadge data={data} />}
          <BlocPointsForts items={data.points_forts} />
          <BlocPointsAmeliorer items={data.points_ameliorer} />
          <BlocSuggestions items={data.suggestions} />
        </>
      )}
    </div>
  )
}

function Header({ data }: { data: BarometreData }) {
  const who =
    data.scope === 'commercial' && data.commercial_prenom
      ? `${data.commercial_prenom}, voici ton baromètre`
      : 'Baromètre équipe'
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
        🌡️ {who}
      </div>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 2, textTransform: 'capitalize' }}>
        {data.periode_libelle}
      </div>
    </div>
  )
}

function TendanceBadge({ data }: { data: BarometreData }) {
  if (!data.tendance_ca) return null
  const { delta_pct, ca_prec } = data.tendance_ca
  const positive = delta_pct > 0
  const bg = positive ? '#ecfdf5' : '#fef2f2'
  const fg = positive ? '#047857' : '#b91c1c'
  return (
    <div
      style={{
        background: bg,
        color: fg,
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        width: 'fit-content',
      }}
    >
      {positive ? '📈' : '📉'} {fmtPct(delta_pct)} vs semaine précédente ({fmtEUR(ca_prec)})
    </div>
  )
}

const BLOC_COLORS = {
  forts: { bg: '#ecfdf5', border: '#a7f3d0', fg: '#065f46', icon: '🟢' },
  ameliorer: { bg: '#fffbeb', border: '#fde68a', fg: '#92400e', icon: '🟠' },
  suggestions: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1e3a8a', icon: '💡' },
}

function Bloc({
  title,
  variant,
  children,
}: {
  title: string
  variant: keyof typeof BLOC_COLORS
  children: React.ReactNode
}) {
  const c = BLOC_COLORS[variant]
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: c.fg,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {c.icon} {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  )
}

function ConstatItem({ c }: { c: Constat }) {
  const color = c.statut === 'vert' ? '#065f46' : c.statut === 'rouge' ? '#b91c1c' : '#92400e'
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 16, lineHeight: 1 }}>{c.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color }}>{c.titre}</div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
          {c.description}
        </div>
      </div>
    </div>
  )
}

function SuggestionItem({ s }: { s: Suggestion }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 16, lineHeight: 1 }}>{s.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a' }}>{s.titre}</div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 2, lineHeight: 1.4 }}>
          {s.description}
        </div>
        {s.impact_estime && (
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
            Impact estimé : {s.impact_estime}
          </div>
        )}
      </div>
    </div>
  )
}

function BlocPointsForts({ items }: { items: Constat[] }) {
  if (items.length === 0) {
    return (
      <Bloc title="Points forts" variant="forts">
        <div style={{ color: '#475569', fontStyle: 'italic', fontSize: 13 }}>
          Aucun point fort significatif détecté sur cette période.
        </div>
      </Bloc>
    )
  }
  return (
    <Bloc title="Points forts" variant="forts">
      {items.map((c, i) => <ConstatItem key={i} c={c} />)}
    </Bloc>
  )
}

function BlocPointsAmeliorer({ items }: { items: Constat[] }) {
  if (items.length === 0) {
    return (
      <Bloc title="Points à améliorer" variant="ameliorer">
        <div style={{ color: '#475569', fontStyle: 'italic', fontSize: 13 }}>
          Tous les indicateurs sont au-dessus des cibles — beau travail.
        </div>
      </Bloc>
    )
  }
  return (
    <Bloc title="Points à améliorer" variant="ameliorer">
      {items.map((c, i) => <ConstatItem key={i} c={c} />)}
    </Bloc>
  )
}

function BlocSuggestions({ items }: { items: Suggestion[] }) {
  if (items.length === 0) return null
  return (
    <Bloc title="Suggestions d'actions" variant="suggestions">
      {items.map((s, i) => <SuggestionItem key={i} s={s} />)}
    </Bloc>
  )
}

export { BarometreEquipe, BarometreCommercial }
