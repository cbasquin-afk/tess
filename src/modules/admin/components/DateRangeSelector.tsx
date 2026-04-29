import { useEffect, useRef, useState, type ChangeEvent } from 'react'

export type DatePreset =
  | 'ce_mois'
  | 'mois_dernier'
  | 'ce_trimestre'
  | 'cette_annee'
  | 'tout'
  | 'custom'

export interface DateRange {
  preset: DatePreset
  debut: string
  fin: string
  label: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const MOIS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function fmtFrShort(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function computePresetRange(
  preset: DatePreset,
  custom?: { debut: string; fin: string },
): DateRange {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  switch (preset) {
    case 'ce_mois': {
      const debut = new Date(y, m, 1)
      const fin = new Date(y, m + 1, 0)
      return {
        preset,
        debut: iso(debut),
        fin: iso(fin),
        label: `${MOIS_FR[m]} ${y}`,
      }
    }
    case 'mois_dernier': {
      const debut = new Date(y, m - 1, 1)
      const fin = new Date(y, m, 0)
      const my = debut.getMonth()
      return {
        preset,
        debut: iso(debut),
        fin: iso(fin),
        label: `${MOIS_FR[my]} ${debut.getFullYear()}`,
      }
    }
    case 'ce_trimestre': {
      const tIdx = Math.floor(m / 3)
      const debut = new Date(y, tIdx * 3, 1)
      const fin = new Date(y, tIdx * 3 + 3, 0)
      return {
        preset,
        debut: iso(debut),
        fin: iso(fin),
        label: `T${tIdx + 1} ${y}`,
      }
    }
    case 'cette_annee': {
      return {
        preset,
        debut: `${y}-01-01`,
        fin: `${y}-12-31`,
        label: `${y}`,
      }
    }
    case 'tout': {
      return {
        preset,
        debut: '2020-01-01',
        fin: `${y}-12-31`,
        label: 'Tout',
      }
    }
    case 'custom': {
      const debut = custom?.debut ?? iso(new Date(y, m, 1))
      const fin = custom?.fin ?? iso(new Date(y, m + 1, 0))
      const dD = new Date(debut)
      const dF = new Date(fin)
      return {
        preset,
        debut,
        fin,
        label: `${fmtFrShort(dD)} → ${fmtFrShort(dF)}`,
      }
    }
  }
}

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'ce_mois', label: 'Ce mois' },
  { key: 'mois_dernier', label: 'Mois dernier' },
  { key: 'ce_trimestre', label: 'Ce trimestre' },
  { key: 'cette_annee', label: 'Cette année' },
  { key: 'tout', label: 'Tout' },
  { key: 'custom', label: 'Personnalisé…' },
]

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangeSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [customDebut, setCustomDebut] = useState(value.debut)
  const [customFin, setCustomFin] = useState(value.fin)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setCustomDebut(value.debut)
    setCustomFin(value.fin)
  }, [value.debut, value.fin])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function pick(p: DatePreset) {
    if (p === 'custom') {
      onChange(computePresetRange('custom', { debut: customDebut, fin: customFin }))
      // garder ouvert pour ajuster les dates
      return
    }
    onChange(computePresetRange(p))
    setOpen(false)
  }

  function applyCustom() {
    onChange(computePresetRange('custom', { debut: customDebut, fin: customFin }))
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          fontSize: 13,
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          background: '#fff',
          color: '#0f172a',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <span style={{ color: '#64748b' }}>📅</span>
        <span>{value.label}</span>
        <span style={{ color: '#94a3b8', fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 50,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
            padding: 6,
            minWidth: 220,
          }}
        >
          {PRESETS.map((p) => {
            const active = value.preset === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => pick(p.key)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#1f3a8a' : '#475569',
                  background: active ? '#eff6ff' : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  marginBottom: 1,
                }}
              >
                {p.label}
              </button>
            )
          })}
          {value.preset === 'custom' && (
            <div
              style={{
                marginTop: 6,
                paddingTop: 8,
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                Du
                <input
                  type="date"
                  value={customDebut}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomDebut(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                Au
                <input
                  type="date"
                  value={customFin}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomFin(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <button
                type="button"
                onClick={applyCustom}
                style={{
                  marginTop: 4,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#1f3a8a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Appliquer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 3,
  padding: '4px 6px',
  fontSize: 12,
  border: '1px solid #cbd5e1',
  borderRadius: 4,
  background: '#f9fafb',
  color: '#0f172a',
  fontWeight: 400,
}
