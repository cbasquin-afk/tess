import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

const Dashboard = lazy(() => import('./views/Dashboard'))
const Import = lazy(() => import('./views/Import'))
const Commerciaux = lazy(() => import('./views/Commerciaux'))
const Contrats = lazy(() => import('./views/Contrats'))

function PerfLeadModule() {
  return (
    <Suspense
      fallback={
        <div style={{ color: '#64748b', fontSize: 14 }}>
          Chargement PerfLead…
        </div>
      }
    >
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="import" element={<Import />} />
        <Route path="commerciaux" element={<Commerciaux />} />
        <Route path="contrats" element={<Contrats />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </Suspense>
  )
}

export default PerfLeadModule
