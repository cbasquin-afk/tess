import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

const Dashboard = lazy(() => import('./views/Dashboard'))
const Instances = lazy(() => import('./views/Instances'))
const Contrats = lazy(() => import('./views/Contrats'))
const Saisie = lazy(() => import('./views/Saisie'))
const Clotures = lazy(() => import('./views/Clotures'))
const Frais = lazy(() => import('./views/Frais'))

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
        <Route path="contrats" element={<Contrats />} />
        <Route path="saisie" element={<Saisie />} />
        <Route path="clotures" element={<Clotures />} />
        <Route path="frais" element={<Frais />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </Suspense>
  )
}

export default AdminModule
