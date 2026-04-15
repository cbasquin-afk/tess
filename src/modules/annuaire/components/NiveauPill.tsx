const COLORS: Record<string, { bg: string; color: string }> = {
  essentiel: { bg: '#f3f4f6', color: '#374151' },
  confort: { bg: '#dbeafe', color: '#1e40af' },
  renforce: { bg: '#ede9fe', color: '#6d28d9' },
  premium: { bg: '#fef3c7', color: '#92400e' },
}

export function NiveauPill({ value }: { value: string }) {
  const c = COLORS[value.toLowerCase()] ?? { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 7px',
        borderRadius: 4,
        background: c.bg,
        color: c.color,
        fontSize: 11,
        fontWeight: 600,
        marginRight: 4,
      }}
    >
      {value}
    </span>
  )
}
