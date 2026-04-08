import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

const Dashboard = lazy(() => import('./views/Dashboard'))
const CA = lazy(() => import('./views/CA'))
const Mandataires = lazy(() => import('./views/Mandataires'))

function FinancesModule() {
  return (
    <Suspense
      fallback={
        <div style={{ color: '#64748b', fontSize: 14 }}>
          Chargement Finances…
        </div>
      }
    >
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="ca" element={<CA />} />
        <Route path="mandataires" element={<Mandataires />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </Suspense>
  )
}

export default FinancesModule
