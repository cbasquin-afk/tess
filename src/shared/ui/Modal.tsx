import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 24,
          minWidth: 320,
          maxWidth: 'min(560px, 92vw)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        }}
      >
        {title && (
          <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>{title}</h2>
        )}
        {children}
      </div>
    </div>
  )
}
