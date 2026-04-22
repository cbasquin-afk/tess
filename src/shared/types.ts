import type { ComponentType } from 'react'

export type UserRole = 'commercial' | 'admin' | 'superadmin' | 'fournisseur'

export interface AppUser {
  id: string
  email: string
  nom: string | null
  prenom: string | null
  role: UserRole
}

export interface ModuleConfig {
  id: string
  label: string
  icon: string
  path: string
  minRole: UserRole
  // Rôles EXPLICITEMENT autorisés en plus de la hiérarchie minRole.
  // Ex. PerfLead accepte le rôle "fournisseur" qui est en marge de la
  // hiérarchie classique.
  allowedRoles?: UserRole[]
  soon?: boolean
  // Si true, le module reste routable mais n'apparaît pas dans la sidebar.
  hidden?: boolean
  loader: () => Promise<{ default: ComponentType }>
}

// fournisseur = 0 → hors de la hiérarchie standard. Ne passe AUCUN minRole.
// L'accès fournisseur à un module doit être déclaré via allowedRoles.
export const ROLE_RANK: Record<UserRole, number> = {
  fournisseur: 0,
  commercial: 1,
  admin: 2,
  superadmin: 3,
}

export function hasRole(userRole: UserRole | null, minRole: UserRole): boolean {
  if (!userRole) return false
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole]
}

export function canAccessModule(
  userRole: UserRole | null,
  m: Pick<ModuleConfig, 'minRole' | 'allowedRoles'>,
): boolean {
  if (!userRole) return false
  if (m.allowedRoles?.includes(userRole)) return true
  return hasRole(userRole, m.minRole)
}
