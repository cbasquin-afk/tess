import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { FinancesProvider } from './context/FinancesContext'
import { lazyWithRetry } from '@/shared/lazyWithRetry'

const Dashboard = lazyWithRetry(() => import('./views/Dashboard'))
const CA = lazyWithRetry(() => import('./views/CA'))
const Mandataires = lazyWithRetry(() => import('./views/Mandataires'))
const Portefeuille = lazyWithRetry(() => import('./views/Portefeuille'))
const Versements = lazyWithRetry(() => import('./views/Versements'))
const Reprises = lazyWithRetry(() => import('./views/Reprises'))
const Marge = lazyWithRetry(() => import('./views/Marge'))
const Charges = lazyWithRetry(() => import('./views/Charges'))
const Factures = lazyWithRetry(() => import('./views/Factures'))
const VersementsReconciliation = lazyWithRetry(() => import('./views/VersementsReconciliation'))

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
          <Route path="versements/bordereau/:id" element={<VersementsReconciliation />} />
          <Route path="reprises" element={<Reprises />} />
          <Route path="marge" element={<Marge />} />
          <Route path="charges" element={<Charges />} />
          <Route path="factures" element={<Factures />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </Suspense>
    </FinancesProvider>
  )
}

export default FinancesModule
