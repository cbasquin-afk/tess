import { fmtInt } from '../utils/format'

export interface DonutSlice {
  label: string
  value: number
  color: string
}

interface VentilationDonutProps {
  title: string
  slices: DonutSlice[]
  emptyLabel?: string
}

const PALETTE = [
  '#1f3a8a', '#0891b2', '#10b981', '#f59e0b', '#ef4444',
  '#7c3aed', '#ec4899', '#64748b',
]

export function colorForIndex(i: number): string {
  return PALETTE[i % PALETTE.length]
}

export function VentilationDonut({ title, slices, emptyLabel }: VentilationDonutProps) {
  const total = slices.reduce((s, x) => s + Math.max(0, x.value), 0)
  const positives = slices.filter((s) => s.value > 0)

  const size = 140
  const radius = 56
  const strokeWidth = 22
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius

  let acc = 0

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
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
        {title}
      </div>
      {total === 0 ? (
        <div style={{ color: '#94a3b8', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>
          {emptyLabel ?? 'Aucune donnée'}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
            <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
            {positives.map((s) => {
              const fraction = s.value / total
              const length = circumference * fraction
              const dashoffset = -acc
              acc += length
              return (
                <circle
                  key={s.label}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={dashoffset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              )
            })}
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 18, fontWeight: 700, fill: '#0f172a' }}
            >
              {fmtInt(total)}
            </text>
            <text
              x={cx}
              y={cy + 12}
              textAnchor="middle"
              style={{ fontSize: 9, fill: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              total
            </text>
          </svg>
          <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {slices.map((s) => {
              const pct = total > 0 ? (s.value / total) * 100 : 0
              return (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: s.value > 0 ? s.color : '#e2e8f0',
                    }}
                  />
                  <span style={{ flex: 1, color: s.value > 0 ? '#0f172a' : '#94a3b8' }}>
                    {s.label}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: '#475569' }}>
                    {fmtInt(s.value)}
                  </span>
                  <span style={{ color: '#94a3b8', minWidth: 38, textAlign: 'right', fontSize: 11 }}>
                    {pct.toFixed(0)} %
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
