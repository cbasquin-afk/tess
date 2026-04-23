import { fmtInt, fmtPct } from '../utils/format'

interface SidecarMetricProps {
  label: string
  count: number
  tauxPct?: number
  note?: string
}

export function SidecarMetric({ label, count, tauxPct, note }: SidecarMetricProps) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 22,
            fontWeight: 700,
            color: '#0f172a',
          }}
        >
          {fmtInt(count)}
        </div>
        {tauxPct !== undefined && (
          <div
            style={{
              fontSize: 13,
              color: '#475569',
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            }}
          >
            {fmtPct(tauxPct)}
          </div>
        )}
      </div>
      {note && (
        <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
          {note}
        </div>
      )}
    </div>
  )
}
