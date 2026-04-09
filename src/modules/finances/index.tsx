import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { FinancesProvider } from './context/FinancesContext'

const Dashboard = lazy(() => import('./views/Dashboard'))
const CA = lazy(() => import('./views/CA'))
const Mandataires = lazy(() => import('./views/Mandataires'))
const Portefeuille = lazy(() => import('./views/Portefeuille'))
const Versements = lazy(() => import('./views/Versements'))
const Reprises = lazy(() => import('./views/Reprises'))
const Marge = lazy(() => import('./views/Marge'))

// FinancesProvider wrap tout le module : 1 seul fetch (commissions +
// contrats lean) au mount, partagé entre Dashboard / CA / Mandataires
// pour toute la durée de la session de navigation dans /finances/*.
// Versements, Reprises, Marge utilisent des hooks locaux distincts.
function FinancesModule() {
  return (
    <FinancesProvider>
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
          <Route path="portefeuille" element={<Portefeuille />} />
          <Route path="versements" element={<Versements />} />
          <Route path="reprises" element={<Reprises />} />
          <Route path="marge" element={<Marge />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </Suspense>
    </FinancesProvider>
  )
}

export default FinancesModule
