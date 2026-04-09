import type { ChangeEvent } from 'react'
import { usePerfLeadFilters } from '../context/FiltersContext'

const COMMERCIAUX = [
  'Christopher BASQUIN',
  'Charlotte BOCOGNANO',
  'Cheyenne DEBENATH',
] as const

const CATEGORIES = [
  'Contrat',
  'En cours',
  'NRP',
  'Perdu',
  'Inexploitable',
  'Rétracté',
] as const

const ORIGINES = [
  'Back-office',
  'MapApp Digital',
  'Multi-équipement',
  'Recommandation',
  'Site web',
] as const

// Valeurs alignées sur le natif (index.html / filter-verticale)
// value = ce qui est en base, label = libellé affiché
const VERTICALES: { value: string; label: string }[] = [
  { value: 'Complémentaire santé', label: 'Mutuelle / Santé' },
  { value: 'Garantie obsèques', label: 'Obsèques' },
  { value: 'Prévoyance pro', label: 'Prévoyance' },
  { value: 'Protection juridique', label: 'Protection juridique' },
  { value: 'Assurance auto', label: 'Assurance auto' },
]

export const PIOCHE_VALUE = '__pioche__'

export function FilterBar() {
  const { filters, setFilters, resetFilters } = usePerfLeadFilters()

  const onDate =
    (key: 'dateFrom' | 'dateTo') => (e: ChangeEvent<HTMLInputElement>) =>
      setFilters({ [key]: e.target.value })

  const onSelect =
    (key: keyof typeof filters) => (e: ChangeEvent<HTMLSelectElement>) =>
      setFilters({ [key]: e.target.value })

  return (
    <div
      style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        position: 'sticky',
        top: 56,
        zIndex: 10,
        color: '#374151',
      }}
    >
      <input
        type="date"
        value={filters.dateFrom}
        onChange={onDate('dateFrom')}
        style={inputStyle}
        aria-label="Date début"
      />
      <span style={{ color: '#9ca3af', fontSize: 12 }}>→</span>
      <input
        type="date"
        value={filters.dateTo}
        onChange={onDate('dateTo')}
        style={inputStyle}
        aria-label="Date fin"
      />

      <select
        value={filters.commercial}
        onChange={onSelect('commercial')}
        style={inputStyle}
        aria-label="Commercial"
      >
        <option value="">Tous commerciaux</option>
        {COMMERCIAUX.map((c) => (
          <option key={c} value={c}>
            {c.split(' ')[0]}
          </option>
        ))}
        <option value={PIOCHE_VALUE}>{'< Pioche >'}</option>
      </select>

      <select
        value={filters.categorie}
        onChange={onSelect('categorie')}
        style={inputStyle}
        aria-label="Catégorie"
      >
        <option value="">Toutes catégories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <select
        value={filters.origine}
        onChange={onSelect('origine')}
        style={inputStyle}
        aria-label="Origine"
      >
        <option value="">Toutes origines</option>
        {ORIGINES.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>

      <select
        value={filters.typeContrat}
        onChange={onSelect('typeContrat')}
        style={inputStyle}
        aria-label="Verticale"
      >
        <option value="">Toutes verticales</option>
        {VERTICALES.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>

      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={resetFilters}
        style={resetStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#e5e7eb'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f3f4f6'
        }}
      >
        Réinitialiser
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#f9fafb',
  border: '1px solid #d1d5db',
  color: '#374151',
  borderRadius: 6,
  padding: '5px 10px',
  fontSize: 12,
  outline: 'none',
}

const resetStyle: React.CSSProperties = {
  background: '#f3f4f6',
  border: '1px solid #d1d5db',
  color: '#6b7280',
  borderRadius: 6,
  padding: '5px 12px',
  fontSize: 12,
  cursor: 'pointer',
  transition: 'background 0.15s',
}
