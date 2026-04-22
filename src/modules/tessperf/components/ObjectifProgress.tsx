import {
  feuTricolore,
  fmtEUR,
  fmtPct,
  FEU_COLORS,
} from '../utils/format'

interface ObjectifProgressProps {
  caRealise: number
  objectifADate: number
  pctObjectifADate: number
  caProjete: number
  objectifProjete: number
  hint?: string
}

export function ObjectifProgress({
  caRealise,
  objectifADate,
  pctObjectifADate,
  caProjete,
  objectifProjete,
  hint,
}: ObjectifProgressProps) {
  const feu = feuTricolore(pctObjectifADate, 100)
  const colors = FEU_COLORS[feu]
  const pctClamped = Math.max(0, Math.min(150, pctObjectifADate))
  const barFill = Math.min(100, pctClamped)
  const projFill =
    objectifProjete > 0
      ? Math.min(100, Math.max(0, (caProjete / objectifProjete) * 100))
      : 0

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Objectif CA acquisition
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 36,
              fontWeight: 700,
              color: colors.fg,
              lineHeight: 1.1,
            }}
          >
            {fmtEUR(caRealise)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Objectif à date
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
            {fmtEUR(objectifADate)}
          </div>
        </div>
      </div>

      {/* Barre principale */}
      <div>
        <div
          style={{
            position: 'relative',
            height: 18,
            background: '#f1f5f9',
            borderRadius: 9,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${barFill}%`,
              background: colors.fg,
              transition: 'width .3s',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12 }}>
          <span style={{ color: colors.fg, fontWeight: 600 }}>
            {fmtPct(pctObjectifADate)} de l'objectif à date
          </span>
          <span style={{ color: '#94a3b8' }}>{fmtEUR(objectifADate)}</span>
        </div>
      </div>

      {/* Projection fin de mois */}
      <div
        style={{
          background: colors.bg,
          borderRadius: 8,
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: colors.fg, fontWeight: 600 }}>
            Projection fin de mois : {fmtEUR(caProjete)}
          </span>
          <span style={{ color: colors.fg }}>
            objectif {fmtEUR(objectifProjete)}
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: '#fff',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${projFill}%`,
              background: colors.fg,
              opacity: 0.6,
            }}
          />
        </div>
      </div>

      {hint && (
        <div style={{ fontSize: 11, color: '#94a3b8' }}>{hint}</div>
      )}
    </div>
  )
}
