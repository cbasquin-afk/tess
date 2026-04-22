import type { ReactNode } from 'react'
import { feuTricolore, fmtPct, FEU_COLORS } from '../utils/format'

interface RatioQualiteProps {
  label: string
  realisePct: number // pourcentage 0..100
  ciblePct: number // pourcentage 0..100
  caption?: ReactNode
  valueExtra?: ReactNode // ex. "59,70 €" sous le ratio
}

export function RatioQualite({
  label,
  realisePct,
  ciblePct,
  caption,
  valueExtra,
}: RatioQualiteProps) {
  const feu = feuTricolore(realisePct, ciblePct)
  const colors = FEU_COLORS[feu]
  const max = Math.max(ciblePct * 1.4, realisePct, 100) || 100
  const fill = Math.min(100, (realisePct / max) * 100)
  const cibleMark = Math.min(100, (ciblePct / max) * 100)

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
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 24,
            fontWeight: 700,
            color: colors.fg,
            lineHeight: 1.1,
          }}
        >
          {fmtPct(realisePct)}
        </div>
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          cible {fmtPct(ciblePct)}
        </div>
      </div>
      {caption && (
        <div style={{ fontSize: 12, color: '#64748b' }}>{caption}</div>
      )}
      <div
        style={{
          position: 'relative',
          height: 8,
          background: '#f1f5f9',
          borderRadius: 4,
          marginTop: 4,
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
        />
      </div>
      {valueExtra && (
        <div style={{ fontSize: 11, color: '#64748b' }}>{valueExtra}</div>
      )}
    </div>
  )
}
