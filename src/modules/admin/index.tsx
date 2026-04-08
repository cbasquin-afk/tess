import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

const Dashboard = lazy(() => import('./views/Dashboard'))
const Instances = lazy(() => import('./views/Instances'))

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
        {/* Sprints A3-A6 ajouteront : contrats, saisie, clotures, frais */}
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </Suspense>
  )
}

export default AdminModule
