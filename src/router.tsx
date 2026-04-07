import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Shell } from './shell/Shell'
import { AuthGuard } from './shared/auth/AuthGuard'
import { MODULES } from './shell/modules.config'
import type { ModuleConfig } from './shared/types'

const Login = lazy(() => import('./shell/Login'))
const Forbidden = lazy(() => import('./shell/Forbidden'))

function lazyModule(m: ModuleConfig) {
  const Component = lazy(m.loader)
  const element = (
    <AuthGuard minRole={m.minRole}>
      <Component />
    </AuthGuard>
  )
  if (m.path === '/') {
    return { index: true as const, element }
  }
  return {
    path: m.path.replace(/^\//, ''),
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
