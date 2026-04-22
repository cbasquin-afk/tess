import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { hasRole, type UserRole } from '../types'

interface AuthGuardProps {
  children: ReactNode
  minRole?: UserRole
  // Rôles explicitement autorisés (alternative au rank minRole).
  allowedRoles?: UserRole[]
}

export function AuthGuard({ children, minRole, allowedRoles }: AuthGuardProps) {
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

  const passesMinRole = !minRole || hasRole(role, minRole)
  const passesAllow = !!allowedRoles?.length && !!role && allowedRoles.includes(role)

  if (!passesMinRole && !passesAllow) {
    // Pour un fournisseur : rediriger vers /perflead (son seul point d'entrée)
    // plutôt que /403, afin qu'une tentative sur une URL admin boucle sur son
    // espace au lieu de crasher.
    if (role === 'fournisseur' && location.pathname !== '/perflead') {
      return <Navigate to="/perflead" replace />
    }
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}
