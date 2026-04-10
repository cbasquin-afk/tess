import { Suspense, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ContractsProvider } from './context/ContractsContext'
import { KpisProvider } from './context/KpisContext'
import { lazyWithRetry } from '@/shared/lazyWithRetry'

const Dashboard = lazyWithRetry(() => import('./views/Dashboard'))
const ZoneTampon = lazyWithRetry(() => import('./views/ZoneTampon'))
const Instances = lazyWithRetry(() => import('./views/Instances'))
const Contrats = lazyWithRetry(() => import('./views/Contrats'))
const Retractations = lazyWithRetry(() => import('./views/Retractations'))
const ResiliationsV2 = lazyWithRetry(() => import('./views/ResiliationsV2'))
const Clotures = lazyWithRetry(() => import('./views/Clotures'))
const Frais = lazyWithRetry(() => import('./views/Frais'))

// Layout route : wrap les vues qui consomment la liste contrats dans
// un ContractsProvider partagé. Le Provider survit aux navigations
// entre /admin/contrats et /admin/frais.
function ContratsLayout() {
  return (
    <ContractsProvider>
      <Outlet />
    </ContractsProvider>
  )
}

// Auto-refresh global toutes les 5 minutes
const REFRESH_INTERVAL_MS = 5 * 60 * 1000

function AdminModule() {
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setRefreshKey((k) => k + 1)
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <KpisProvider refreshKey={refreshKey}>
      <Suspense
        fallback={
          <div style={{ color: '#64748b', fontSize: 14 }}>
            Chargement TessAdmin…
          </div>
        }
      >
        <Routes key={refreshKey}>
          <Route index element={<Dashboard />} />
          <Route path="zone-tampon" element={<ZoneTampon />} />
          <Route path="instances" element={<Instances />} />
          <Route path="clotures" element={<Clotures />} />
          <Route path="retractations" element={<Retractations />} />
          <Route path="resiliations" element={<ResiliationsV2 />} />

          {/* Routes partageant la liste contrats via ContractsProvider */}
          <Route element={<ContratsLayout />}>
            <Route path="contrats" element={<Contrats />} />
            <Route path="frais" element={<Frais />} />
          </Route>

          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </Suspense>
    </KpisProvider>
  )
}

export default AdminModule
