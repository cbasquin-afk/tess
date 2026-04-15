import type { StatutPartenaire } from '../types'

const STYLES: Record<
  StatutPartenaire,
  { bg: string; color: string; label: string }
> = {
  partenaire_direct: { bg: '#dbeafe', color: '#1e40af', label: 'Direct' },
  partenaire_indirect: { bg: '#ede9fe', color: '#6d28d9', label: 'Indirect' },
  non_partenaire: { bg: '#f3f4f6', color: '#6b7280', label: 'Non partenaire' },
}

export function PartenaireBadge({ value }: { value: StatutPartenaire }) {
  const s = STYLES[value] ?? STYLES.non_partenaire
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        background: s.bg,
        color: s.color,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
      }}
    >
      {s.label}
    </span>
  )
}
