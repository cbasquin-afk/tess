import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { lazyWithRetry } from '@/shared/lazyWithRetry'

const DashboardEquipe = lazyWithRetry(() => import('./views/DashboardEquipe'))
const DashboardCommercial = lazyWithRetry(() => import('./views/DashboardCommercial'))

function TessPerfModule() {
  return (
    <Suspense
      fallback={
        <div style={{ color: '#64748b', fontSize: 14, padding: 24 }}>
          Chargement TessPerf…
        </div>
      }
    >
      <Routes>
        <Route index element={<DashboardEquipe />} />
        <Route path="commercial/:id" element={<DashboardCommercial />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </Suspense>
  )
}

export default TessPerfModule
