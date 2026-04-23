import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { lazyWithRetry } from '@/shared/lazyWithRetry'

const DashboardEquipe = lazyWithRetry(() => import('./views/DashboardEquipe'))
const DashboardCommercial = lazyWithRetry(() => import('./views/DashboardCommercial'))
const WeeklyEquipe = lazyWithRetry(() => import('./views/WeeklyEquipe'))
const WeeklyCommercial = lazyWithRetry(() => import('./views/WeeklyCommercial'))

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
        <Route index element={<Navigate to="mensuel/equipe" replace />} />
        <Route path="mensuel/equipe" element={<DashboardEquipe />} />
        <Route path="mensuel/commercial/:id" element={<DashboardCommercial />} />
        <Route path="hebdomadaire/equipe" element={<WeeklyEquipe />} />
        <Route path="hebdomadaire/commercial/:id" element={<WeeklyCommercial />} />
        {/* Legacy v1 : redirige toute ancienne URL vers la nouvelle nav */}
        <Route path="commercial/:id" element={<Navigate to="../mensuel/equipe" replace />} />
        <Route path="*" element={<Navigate to="mensuel/equipe" replace />} />
      </Routes>
    </Suspense>
  )
}

export default TessPerfModule
