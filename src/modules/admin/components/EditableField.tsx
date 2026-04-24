import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

export interface QuickAction {
  label: string
  title?: string
  apply: (current: number) => number
}

interface EditableFieldProps {
  value: number | null
  onSave: (newValue: number | null) => Promise<void>
  type?: 'number'
  step?: number
  suffix?: string
  format?: (v: number | null) => string
  /** Texte du prompt de confirmation. Si absent → pas de modale. */
  confirmMessage?: string
  /** Boutons de raccourci (ex. -8% multi-équip). */
  quickActions?: QuickAction[]
  /** Empêche l'édition (désactive le clic). */
  disabled?: boolean
  /** Classe de rendu en lecture (ex. couleur). */
  readClassName?: string
}

const MONO = "'JetBrains Mono', ui-monospace, monospace"

export function EditableField({
  value,
  onSave,
  step = 0.01,
  suffix,
  format,
  confirmMessage,
  quickActions,
  disabled,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState<string>(
    value !== null && value !== undefined ? String(value) : '',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const pendingRef = useRef<number | null>(null)

  useEffect(() => {
    setLocalValue(value !== null && value !== undefined ? String(value) : '')
  }, [value])

  function startEdit() {
    if (disabled) return
    setLocalValue(value !== null && value !== undefined ? String(value) : '')
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function cancelEdit() {
    setEditing(false)
    setError(null)
    setLocalValue(value !== null && value !== undefined ? String(value) : '')
  }

  function parseLocal(): number | null {
    const s = localValue.trim()
    if (s === '') return null
    const n = parseFloat(s.replace(',', '.'))
    if (!Number.isFinite(n)) throw new Error('Valeur invalide')
    if (n < 0) throw new Error('Valeur négative interdite')
    return n
  }

  async function commit(newValue: number | null) {
    setSaving(true)
    setError(null)
    try {
      await onSave(newValue)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function attemptSave() {
    let next: number | null
    try {
      next = parseLocal()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return
    }
    // Pas de modif → cancel silencieux
    if (next === value) {
      cancelEdit()
      return
    }
    if (confirmMessage) {
      pendingRef.current = next
      setConfirmOpen(true)
      return
    }
    await commit(next)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void attemptSave()
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  function applyQuick(qa: QuickAction) {
    const base = parseFloat(localValue.replace(',', '.')) || Number(value) || 0
    const next = qa.apply(base)
    setLocalValue(String(Math.round(next * 100) / 100))
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  // ── Mode lecture ────────────────────────────────────────────
  if (!editing) {
    const display = format
      ? format(value)
      : value !== null && value !== undefined
        ? `${value}${suffix ? ` ${suffix}` : ''}`
        : '—'
    return (
      <span
        onClick={startEdit}
        title={disabled ? undefined : 'Cliquer pour modifier'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          cursor: disabled ? 'default' : 'pointer',
          fontSize: 13,
          color: value == null ? '#cbd5e1' : '#0f172a',
          padding: '2px 6px',
          margin: '-2px -6px',
          borderRadius: 4,
          border: '1px dashed transparent',
          transition: 'border-color .15s, background .15s',
        }}
        onMouseEnter={(e) => {
          if (disabled) return
          e.currentTarget.style.borderColor = '#cbd5e1'
          e.currentTarget.style.background = '#f8fafc'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'transparent'
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <span>{display}</span>
        {!disabled && (
          <span style={{ fontSize: 10, color: '#94a3b8', opacity: 0.7 }}>✎</span>
        )}
      </span>
    )
  }

  // ── Mode édition ────────────────────────────────────────────
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <input
          ref={inputRef}
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          step={step}
          inputMode="decimal"
          disabled={saving}
          style={{
            width: 110,
            border: `1px solid ${error ? '#ef4444' : '#1f3a8a'}`,
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 13,
            fontFamily: MONO,
            outline: 'none',
            textAlign: 'right',
          }}
        />
        {suffix && (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{suffix}</span>
        )}
        <button
          type="button"
          onClick={() => void attemptSave()}
          disabled={saving}
          title="Valider (Entrée)"
          style={btnValid}
        >
          {saving ? '…' : '✓'}
        </button>
        <button
          type="button"
          onClick={cancelEdit}
          disabled={saving}
          title="Annuler (Échap)"
          style={btnCancel}
        >
          ✗
        </button>
        {quickActions && quickActions.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                type="button"
                onClick={() => applyQuick(qa)}
                disabled={saving}
                title={qa.title ?? qa.label}
                style={btnQuick}
              >
                {qa.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && (
        <div style={{ marginTop: 4, fontSize: 11, color: '#dc2626' }}>
          {error}
        </div>
      )}
      {confirmOpen && confirmMessage && (
        <ConfirmModal
          message={confirmMessage}
          onConfirm={async () => {
            setConfirmOpen(false)
            await commit(pendingRef.current)
            pendingRef.current = null
          }}
          onCancel={() => {
            setConfirmOpen(false)
            pendingRef.current = null
          }}
        />
      )}
    </>
  )
}

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 10,
          padding: 20,
          width: 'min(420px, 92vw)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontSize: 14, color: '#0f172a', marginBottom: 16, lineHeight: 1.4 }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={btnCancelModal}>
            Annuler
          </button>
          <button type="button" onClick={() => void onConfirm()} style={btnConfirmModal}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}

const btnValid: React.CSSProperties = {
  background: '#1D9E75',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '4px 10px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}
const btnCancel: React.CSSProperties = {
  background: '#fff',
  color: '#64748b',
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  padding: '4px 10px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}
const btnQuick: React.CSSProperties = {
  background: '#eff6ff',
  color: '#1f3a8a',
  border: '1px solid #bfdbfe',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
}
const btnCancelModal: React.CSSProperties = {
  background: '#fff',
  color: '#475569',
  border: '1px solid #cbd5e1',
  borderRadius: 6,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
const btnConfirmModal: React.CSSProperties = {
  background: '#1f3a8a',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
