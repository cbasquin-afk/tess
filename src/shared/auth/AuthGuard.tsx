import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { hasRole, type UserRole } from '../types'

interface AuthGuardProps {
  children: ReactNode
  minRole?: UserRole
}

export function AuthGuard({ children, minRole }: AuthGuardProps) {
  const { session, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
        Chargement…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (minRole && !hasRole(role, minRole)) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}
