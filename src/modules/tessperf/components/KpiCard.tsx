import type { ReactNode } from 'react'
import type { FeuTricolore } from '../types'
import { FEU_COLORS } from '../utils/format'

interface KpiCardProps {
  label: string
  value: ReactNode
  sublabel?: ReactNode
  feu?: FeuTricolore
  hint?: ReactNode
  big?: boolean
}

export function KpiCard({ label, value, sublabel, feu, hint, big }: KpiCardProps) {
  const colors = feu ? FEU_COLORS[feu] : null
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
      <div
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: big ? 32 : 22,
          fontWeight: 700,
          color: colors?.fg ?? '#0f172a',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sublabel && (
        <div style={{ fontSize: 12, color: '#64748b' }}>{sublabel}</div>
      )}
      {hint && (
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  )
}
