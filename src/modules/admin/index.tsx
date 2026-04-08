import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ContractsProvider } from './context/ContractsContext'

const Dashboard = lazy(() => import('./views/Dashboard'))
const Instances = lazy(() => import('./views/Instances'))
const Contrats = lazy(() => import('./views/Contrats'))
const Saisie = lazy(() => import('./views/Saisie'))
const Clotures = lazy(() => import('./views/Clotures'))
const Frais = lazy(() => import('./views/Frais'))

// Layout route : wrap les vues qui consomment la liste contrats dans un
// ContractsProvider partagé. Le Provider survit aux navigations entre
// /admin/contrats, /admin/saisie et /admin/frais — pas de re-fetch.
function ContratsLayout() {
  return (
    <ContractsProvider>
      <Outlet />
    </ContractsProvider>
  )
}

function AdminModule() {
  return (
    <Suspense
      fallback={
        <div style={{ color: '#64748b', fontSize: 14 }}>
          Chargement TessAdmin…
        </div>
      }
    >
      <Routes>
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
  )
}

export default AdminModule
