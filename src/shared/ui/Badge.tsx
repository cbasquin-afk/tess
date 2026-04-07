import type { ReactNode } from 'react'

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

interface BadgeProps {
  children: ReactNode
  tone?: Tone
}

const tones: Record<Tone, { bg: string; color: string }> = {
  neutral: { bg: '#f3f4f6', color: '#374151' },
  info: { bg: '#dbeafe', color: '#1e40af' },
  success: { bg: '#dcfce7', color: '#166534' },
  warning: { bg: '#fef3c7', color: '#92400e' },
  danger: { bg: '#fee2e2', color: '#991b1b' },
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  const c = tones[tone]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        background: c.bg,
        color: c.color,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
      }}
    >
      {children}
    </span>
  )
}
