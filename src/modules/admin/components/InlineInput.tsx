import { useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { updateField } from '../api'

export interface InlineInputProps {
  contratId: string
  field: string
  value: number | null
  suffix?: string
  placeholder?: string
}

/**
 * Cellule éditable en place pour valeurs numériques.
 * Affiche la valeur formatée au repos, bascule en input au clic.
 * Appelle tadmin_update_field au blur/Enter.
 */
export function InlineInput({
  contratId,
  field,
  value,
  suffix = '€',
  placeholder = '—',
}: InlineInputProps) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState<string>(
    value !== null ? String(value) : '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  function startEdit() {
    setLocalValue(value !== null ? String(value) : '')
    setEditing(true)
  }

  async function save() {
    setEditing(false)
    const num = localValue.trim() === '' ? null : parseFloat(localValue)
    const strVal = num !== null ? String(num) : null

    // Skip if unchanged
    if (num === value) return

    setSaving(true)
    setError(false)
    try {
      await updateField(contratId, field, strVal)
    } catch {
      setLocalValue(value !== null ? String(value) : '')
      setError(true)
      setTimeout(() => setError(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void save()
    } else if (e.key === 'Escape') {
      setEditing(false)
      setLocalValue(value !== null ? String(value) : '')
    }
  }

  if (editing) {
    return (
      <input
        type="number"
        value={localValue}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          setLocalValue(e.target.value)
        }
        onBlur={() => void save()}
        onKeyDown={handleKeyDown}
        autoFocus
        step="0.01"
        style={{
          width: 70,
          border: '1px solid #d1d5db',
          borderRadius: 4,
          padding: '3px 6px',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          outline: 'none',
          textAlign: 'right',
        }}
      />
    )
  }

  const color = error ? '#E24B4A' : saving ? '#94a3b8' : '#475569'
  const display =
    value !== null
      ? `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} ${suffix}`
      : placeholder

  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        startEdit()
      }}
      title="Cliquer pour modifier"
      style={{
        cursor: 'pointer',
        fontFamily: "'JetBrains Mono', ui-monospace, monospace",
        fontSize: 11,
        fontWeight: value !== null ? 600 : 400,
        color,
        padding: '3px 6px',
        borderRadius: 4,
        border: `1px solid ${color}20`,
        background: `${color}08`,
      }}
    >
      {display}
    </span>
  )
}
