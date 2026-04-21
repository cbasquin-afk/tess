import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/shared/auth/useAuth'
import { hasRole } from '@/shared/types'
import {
  fetchLastRebuild,
  triggerSiteRebuild,
  type LastRebuildRow,
} from '../api'

const COOLDOWN_MS = 5 * 60 * 1000

type UiState = 'idle' | 'cooldown' | 'loading'

interface Toast {
  message: string
  level: 'success' | 'error'
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 0) return 'à l’instant'
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'il y a moins d’une minute'
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  const rem = min % 60
  if (h < 24) return rem === 0 ? `il y a ${h}h` : `il y a ${h}h ${rem}m`
  const d = Math.floor(h / 24)
  return `il y a ${d}j`
}

function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function RebuildSiteButton() {
  const { role } = useAuth()
  const [last, setLast] = useState<LastRebuildRow | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const countdownTimerRef = useRef<number | null>(null)

  const canRender = hasRole(role, 'admin')

  const loadLast = useCallback(async () => {
    const row = await fetchLastRebuild()
    setLast(row)
    if (row) {
      const elapsed = Date.now() - new Date(row.triggered_at).getTime()
      const left = COOLDOWN_MS - elapsed
      setRemaining(left > 0 ? Math.floor(left / 1000) : 0)
    } else {
      setRemaining(0)
    }
  }, [])

  useEffect(() => {
    if (!canRender) return
    void loadLast()
  }, [canRender, loadLast])

  // Décompte cooldown
  useEffect(() => {
    if (remaining <= 0) return
    countdownTimerRef.current = window.setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1))
    }, 1000)
    return () => {
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current)
        countdownTimerRef.current = null
      }
    }
  }, [remaining])

  const showToast = useCallback((t: Toast) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast(t)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 5000)
  }, [])

  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
      if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current)
    },
    [],
  )

  const uiState: UiState = loading ? 'loading' : remaining > 0 ? 'cooldown' : 'idle'

  const onClick = useCallback(async () => {
    if (uiState !== 'idle') return
    const ok = window.confirm(
      'Confirmer le rebuild du site public tessoria.fr ?\n\n' +
        'Cela va publier toutes les dernières modifications des fiches éditoriales.\n' +
        'Durée : 2-5 minutes.',
    )
    if (!ok) return
    setLoading(true)
    try {
      const res = await triggerSiteRebuild()
      if (res.ok) {
        showToast({
          message: 'Rebuild déclenché. Le site sera à jour dans 2-5 min.',
          level: 'success',
        })
        await loadLast()
      } else if (res.rateLimited) {
        showToast({ message: res.message, level: 'error' })
        if (typeof res.remainingSeconds === 'number') {
          setRemaining(res.remainingSeconds)
        }
      } else {
        showToast({ message: res.message, level: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }, [uiState, showToast, loadLast])

  if (!canRender) return null

  const label =
    uiState === 'loading'
      ? '⏳ Déclenchement…'
      : uiState === 'cooldown'
        ? `⏱ Prochain rebuild dans ${formatCountdown(remaining)}`
        : '🔄 Publier sur tessoria.fr'

  const disabled = uiState !== 'idle'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        style={{
          padding: '8px 14px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          border: '1px solid',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? '#e5e7eb' : '#1f3a8a',
          color: disabled ? '#6b7280' : '#fff',
          borderColor: disabled ? '#e5e7eb' : '#1f3a8a',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </button>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>
        {last
          ? `Dernier build : ${formatRelative(last.triggered_at)}${
              last.triggered_by_email ? ` · ${last.triggered_by_email}` : ''
            }`
          : 'Dernier build : jamais'}
      </div>
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 1000,
            padding: '10px 14px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            background: toast.level === 'success' ? '#10b981' : '#dc2626',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxWidth: 360,
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

export default RebuildSiteButton
