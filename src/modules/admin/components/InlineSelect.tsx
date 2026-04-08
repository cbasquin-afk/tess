import { useEffect, useState, type ChangeEvent } from 'react'
import { updateField } from '../api'

export interface InlineSelectOption {
  value: string
  label: string
  color?: string
}

export interface InlineSelectProps {
  contratId: string
  field: string
  value: string | null
  options: readonly InlineSelectOption[]
  placeholder?: string
}

/**
 * Cellule éditable en place : <select> qui appelle tadmin_update_field
 * au change. Optimistic update : la valeur s'affiche immédiatement et
 * revert si le RPC échoue. Pas de reload global après succès — la
 * valeur locale persiste jusqu'au prochain refresh complet.
 */
export function InlineSelect({
  contratId,
  field,
  value,
  options,
  placeholder = '—',
}: InlineSelectProps) {
  const [localValue, setLocalValue] = useState<string>(value ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  // Sync si la prop change (ex: refresh global ou reload externe)
  useEffect(() => {
    setLocalValue(value ?? '')
    setError(false)
  }, [value])

  async function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const newVal = e.target.value
    const prev = localValue
    setLocalValue(newVal)
    setSaving(true)
    setError(false)
    try {
      await updateField(contratId, field, newVal || null)
    } catch {
      setLocalValue(prev)
      setError(true)
      // Auto-clear l'erreur après 2.5s pour ne pas gêner
      setTimeout(() => setError(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const current = options.find((o) => o.value === localValue)
  const color = error
    ? '#E24B4A'
    : (current?.color ?? '#94a3b8')

  return (
    <select
      value={localValue}
      onChange={(e) => {
        void handleChange(e)
      }}
      onClick={(e) => e.stopPropagation()}
      disabled={saving}
      title={error ? 'Erreur de sauvegarde' : undefined}
      style={{
        border: `1px solid ${color}30`,
        background: `${color}15`,
        color,
        fontWeight: 600,
        fontSize: 11,
        borderRadius: 4,
        padding: '3px 6px',
        cursor: saving ? 'wait' : 'pointer',
        outline: 'none',
        fontFamily: 'inherit',
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        paddingRight: 18,
        // Petite flèche custom
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='${encodeURIComponent(color)}' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 5px center',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
