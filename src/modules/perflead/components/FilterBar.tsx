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
  'MapApp Digital',
  'Back-office',
  'Site web',
  'Recommandation',
] as const

const VERTICALES = [
  'Complémentaire santé',
  'Obsèques',
  'Animaux',
  'Emprunteur',
  'TNS',
] as const

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
        background: '#161616',
        borderBottom: '1px solid #222',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        position: 'sticky',
        top: 56,
        zIndex: 10,
      }}
    >
      <input
        type="date"
        value={filters.dateFrom}
        onChange={onDate('dateFrom')}
        style={inputStyle}
        aria-label="Date début"
      />
      <span style={{ color: '#666', fontSize: 12 }}>→</span>
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
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={resetFilters}
        style={resetStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#aaa'
          e.currentTarget.style.borderColor = '#555'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#666'
          e.currentTarget.style.borderColor = '#333'
        }}
      >
        Réinitialiser
      </button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #2a2a2a',
  color: '#ccc',
  borderRadius: 5,
  padding: '4px 8px',
  fontSize: 12,
  outline: 'none',
}

const resetStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #333',
  color: '#666',
  borderRadius: 5,
  padding: '4px 10px',
  fontSize: 11,
  cursor: 'pointer',
  transition: 'color 0.15s, border-color 0.15s',
}
