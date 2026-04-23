export type Period = 'mois' | 'semaine'

interface PeriodSwitchProps {
  value: Period
  onChange: (p: Period) => void
}

export function PeriodSwitch({ value, onChange }: PeriodSwitchProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        border: '1px solid #d1d5db',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {(['mois', 'semaine'] as const).map((p) => {
        const active = value === p
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
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
  )
}
