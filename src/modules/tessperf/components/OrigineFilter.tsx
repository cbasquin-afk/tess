import { ORIGINES, ORIGINE_LABELS, type Origine } from '../types'

interface Props {
  value: Origine
  onChange: (o: Origine) => void
}

export function OrigineFilter({ value, onChange }: Props) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>
        Origine
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Origine)}
        style={{
          padding: '6px 10px',
          fontSize: 13,
          border: '1px solid #d1d5db',
          borderRadius: 6,
          background: '#f9fafb',
          color: '#0f172a',
        }}
      >
        {ORIGINES.map((o) => (
          <option key={o} value={o}>{ORIGINE_LABELS[o]}</option>
        ))}
      </select>
    </label>
  )
}
