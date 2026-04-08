import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ContractsProvider } from './context/ContractsContext'
import { KpisProvider } from './context/KpisContext'

const Dashboard = lazy(() => import('./views/Dashboard'))
const Instances = lazy(() => import('./views/Instances'))
const Contrats = lazy(() => import('./views/Contrats'))
const Saisie = lazy(() => import('./views/Saisie'))
const Clotures = lazy(() => import('./views/Clotures'))
const Frais = lazy(() => import('./views/Frais'))

// Layout route : wrap les vues qui consomment la liste contrats dans
// un ContractsProvider partagé. Le Provider survit aux navigations
// entre /admin/contrats, /admin/saisie et /admin/frais.
function ContratsLayout() {
  return (
    <ContractsProvider>
      <Outlet />
    </ContractsProvider>
  )
}

// Auto-refresh global toutes les 5 minutes — fidèle au natif
// `setInterval(loadAll, 5 * 60 * 1000)`. L'incrémentation du
// refreshKey force le re-mount des Routes (donc le refetch de tous
// les hooks utilisés par la vue active) et déclenche le refetch des
// KPIs via la dépendance du KpisProvider.
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
          <Route path="instances" element={<Instances />} />
          <Route path="clotures" element={<Clotures />} />

          {/* Routes partageant la liste contrats via ContractsProvider */}
          <Route element={<ContratsLayout />}>
            <Route path="contrats" element={<Contrats />} />
            <Route path="saisie" element={<Saisie />} />
            <Route path="frais" element={<Frais />} />
          </Route>

          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </Suspense>
    </KpisProvider>
  )
}

export default AdminModule
