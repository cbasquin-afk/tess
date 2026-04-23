import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Shell } from './shell/Shell'
import { AuthGuard } from './shared/auth/AuthGuard'
import { MODULES } from './shell/modules.config'
import { lazyWithRetry } from './shared/lazyWithRetry'
import type { ModuleConfig } from './shared/types'

const Login = lazyWithRetry(() => import('./shell/Login'))
const Forbidden = lazyWithRetry(() => import('./shell/Forbidden'))

function lazyModule(m: ModuleConfig) {
  const Component = lazyWithRetry(m.loader)
  const element = (
    <AuthGuard minRole={m.minRole} allowedRoles={m.allowedRoles}>
      <Component />
    </AuthGuard>
  )
  if (m.path === '/') {
    return { index: true as const, element }
  }
  return {
    // `/*` permet à chaque module d'avoir ses propres sous-routes
    path: m.path.replace(/^\//, '') + '/*',
    element,
  }
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/403',
    element: <Forbidden />,
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <Shell />
      </AuthGuard>
    ),
    children: [
      ...MODULES.map(lazyModule),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
