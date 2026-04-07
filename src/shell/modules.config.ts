import type { ModuleConfig } from '../shared/types'

export const MODULES: ModuleConfig[] = [
  {
    id: 'home',
    label: 'Accueil',
    icon: '🏠',
    path: '/',
    minRole: 'commercial',
    loader: () => import('../modules/home'),
  },
  {
    id: 'perflead',
    label: 'PerfLead',
    icon: '🎯',
    path: '/perflead',
    minRole: 'commercial',
    loader: () => import('../modules/perflead'),
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: '⚙️',
    path: '/admin',
    minRole: 'admin',
    loader: () => import('../modules/admin'),
  },
  {
    id: 'finances',
    label: 'Finances',
    icon: '💶',
    path: '/finances',
    minRole: 'admin',
    soon: true,
    loader: () => import('../modules/finances'),
  },
  {
    id: 'conformite',
    label: 'Conformité',
    icon: '🛡️',
    path: '/conformite',
    minRole: 'admin',
    soon: true,
    loader: () => import('../modules/conformite'),
  },
]
