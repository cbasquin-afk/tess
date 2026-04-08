import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PerfLeadFiltersProvider } from './context/FiltersContext'
import { FilterBar } from './components/FilterBar'

const Dashboard = lazy(() => import('./views/Dashboard'))
const Import = lazy(() => import('./views/Import'))
const Commerciaux = lazy(() => import('./views/Commerciaux'))
const Contrats = lazy(() => import('./views/Contrats'))
const Hebdo = lazy(() => import('./views/Hebdo'))
const Analyse = lazy(() => import('./views/Analyse'))
const Gammes = lazy(() => import('./views/Gammes'))
const Ages = lazy(() => import('./views/Ages'))
const Pipeline = lazy(() => import('./views/Pipeline'))
const Statuts = lazy(() => import('./views/Statuts'))
const Alertes = lazy(() => import('./views/Alertes'))
const Personae = lazy(() => import('./views/Personae'))
const Fournisseur = lazy(() => import('./views/Fournisseur'))

function PerfLeadModule() {
  // FilterBar dans le flux normal du contenu (le Shell.main fournit déjà
  // le padding 32). Sticky top: 56 la cale sous la Topbar lors du scroll.
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
            <Route path="analyse" element={<Analyse />} />
            <Route path="gammes" element={<Gammes />} />
            <Route path="ages" element={<Ages />} />
            <Route path="pipeline" element={<Pipeline />} />
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
