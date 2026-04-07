import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const palette: Record<Variant, { bg: string; color: string; border: string }> = {
  primary: { bg: '#1f3a8a', color: '#fff', border: '#1f3a8a' },
  secondary: { bg: '#fff', color: '#1f3a8a', border: '#1f3a8a' },
  ghost: { bg: 'transparent', color: '#374151', border: 'transparent' },
  danger: { bg: '#dc2626', color: '#fff', border: '#dc2626' },
}

export function Button({
  variant = 'primary',
  children,
  style,
  ...rest
}: ButtonProps) {
  const c = palette[variant]
  return (
    <button
      {...rest}
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        padding: '8px 14px',
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
