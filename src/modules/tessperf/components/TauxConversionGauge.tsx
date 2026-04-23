import { feuTricolore, fmtPct, FEU_COLORS } from '../utils/format'

interface TauxConversionGaugeProps {
  realise: number // en %
  cible: number // en %
  signes: number
  decroches: number
}

export function TauxConversionGauge({
  realise,
  cible,
  signes,
  decroches,
}: TauxConversionGaugeProps) {
  const feu = feuTricolore(realise, cible)
  const colors = FEU_COLORS[feu]
  // Échelle visuelle : on cale la cible à 60% de la barre pour pouvoir
  // afficher le dépassement (jusqu'à ~166% de la cible)
  const max = Math.max(realise, cible) * 1.4 || cible * 1.4 || 30
  const fill = Math.min(100, (realise / max) * 100)
  const cibleMark = Math.min(100, (cible / max) * 100)

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flex: 1,
        minWidth: 200,
      }}
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
        Taux de conversion
      </div>
      <div
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 32,
          fontWeight: 700,
          color: colors.fg,
          lineHeight: 1.1,
        }}
      >
        {fmtPct(realise)}
      </div>
      <div style={{ fontSize: 12, color: '#64748b' }}>
        {signes} signés / {decroches} décrochés
      </div>
      <div style={{ position: 'relative', marginTop: 6 }}>
        <div
          style={{
            position: 'relative',
            height: 8,
            background: '#f1f5f9',
            borderRadius: 4,
            overflow: 'visible',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${fill}%`,
              background: colors.fg,
              borderRadius: 4,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${cibleMark}%`,
              top: -3,
              bottom: -3,
              width: 2,
              background: '#0f172a',
            }}
            title={`Cible ${fmtPct(cible)}`}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#94a3b8' }}>
          <span>0</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>cible {fmtPct(cible)}</span>
          <span>{fmtPct(max)}</span>
        </div>
      </div>
    </div>
  )
}
