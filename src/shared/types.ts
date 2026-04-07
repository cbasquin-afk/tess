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
  soon?: boolean
  loader: () => Promise<{ default: ComponentType }>
}

export const ROLE_RANK: Record<UserRole, number> = {
  fournisseur: 1,
  commercial: 1,
  admin: 2,
  superadmin: 3,
}

export function hasRole(userRole: UserRole | null, minRole: UserRole): boolean {
  if (!userRole) return false
  return ROLE_RANK[userRole] >= ROLE_RANK[minRole]
}
