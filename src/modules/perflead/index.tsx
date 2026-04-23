import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PerfLeadFiltersProvider } from './context/FiltersContext'
import { FilterBar } from './components/FilterBar'
import { lazyWithRetry } from '@/shared/lazyWithRetry'

const Dashboard = lazyWithRetry(() => import('./views/Dashboard'))
const Import = lazyWithRetry(() => import('./views/Import'))
const Commerciaux = lazyWithRetry(() => import('./views/Commerciaux'))
const Contrats = lazyWithRetry(() => import('./views/Contrats'))
const Hebdo = lazyWithRetry(() => import('./views/Hebdo'))
const Analyse = lazyWithRetry(() => import('./views/Analyse'))
const Gammes = lazyWithRetry(() => import('./views/Gammes'))
const Ages = lazyWithRetry(() => import('./views/Ages'))
const Pipeline = lazyWithRetry(() => import('./views/Pipeline'))
const Entonnoir = lazyWithRetry(() => import('./views/Entonnoir'))
const Statuts = lazyWithRetry(() => import('./views/Statuts'))
const Alertes = lazyWithRetry(() => import('./views/Alertes'))
const Personae = lazyWithRetry(() => import('./views/Personae'))
const Fournisseur = lazyWithRetry(() => import('./views/Fournisseur'))

function PerfLeadModule() {
  // FilterBar dans le flux normal du contenu (le Shell.main fournit déjà
  // le padding 32). Sticky top: 56 la cale sous la Topbar lors du scroll.
  // Les fournisseurs accèdent à toutes les sous-routes PerfLead. Le garde-fou
  // "uniquement PerfLead" est appliqué au niveau router (allowedRoles) +
  // AuthGuard (redirect /perflead si autre module tenté).
  return (
    <PerfLeadFiltersProvider>
      <FilterBar />
      <div style={{ paddingTop: 24 }}>
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
            <Route path="hebdo" element={<Hebdo />} />
            <Route path="hebdomadaire" element={<Hebdo />} />
            <Route path="analyse" element={<Analyse />} />
            <Route path="analyse-leads" element={<Analyse />} />
            <Route path="gammes" element={<Gammes />} />
            <Route path="ages" element={<Ages />} />
            <Route path="tranches-age" element={<Ages />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="entonnoir" element={<Entonnoir />} />
            <Route path="statuts" element={<Statuts />} />
            <Route path="alertes" element={<Alertes />} />
            <Route path="personae" element={<Personae />} />
            <Route path="fournisseur" element={<Fournisseur />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </Suspense>
      </div>
    </PerfLeadFiltersProvider>
  )
}

export default PerfLeadModule
