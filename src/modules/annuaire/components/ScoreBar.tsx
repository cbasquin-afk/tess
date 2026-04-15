export function ScoreBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  const color =
    clamped >= 80 ? '#10b981' : clamped >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: '#f1f5f9',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          fontWeight: 600,
          color,
          minWidth: 28,
          textAlign: 'right',
        }}
      >
        {clamped}
      </span>
    </div>
  )
}
