import { Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PerfLeadFiltersProvider } from './context/FiltersContext'
import { FilterBar } from './components/FilterBar'
import { lazyWithRetry } from '@/shared/lazyWithRetry'
import { useAuth } from '@/shared/auth/useAuth'

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

// Sous-routes interdites au fournisseur. Garde-fou : même si les liens ne
// sont pas exposés dans la sidebar, une URL tapée directement retombe ici.
const FOURNISSEUR_ALLOWED_SUBPATHS = new Set<string>([
  '', // /perflead = Dashboard
  'hebdo',
  'hebdomadaire',
  'statuts',
  'analyse',
  'analyse-leads',
])

function FournisseurGuard({ children, subpath }: { children: ReactNode; subpath: string }) {
  const { role } = useAuth()
  if (role === 'fournisseur' && !FOURNISSEUR_ALLOWED_SUBPATHS.has(subpath)) {
    return <Navigate to="/perflead" replace />
  }
  return <>{children}</>
}

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
            <Route index element={<FournisseurGuard subpath=""><Dashboard /></FournisseurGuard>} />
            <Route path="import" element={<FournisseurGuard subpath="import"><Import /></FournisseurGuard>} />
            <Route path="commerciaux" element={<FournisseurGuard subpath="commerciaux"><Commerciaux /></FournisseurGuard>} />
            <Route path="contrats" element={<FournisseurGuard subpath="contrats"><Contrats /></FournisseurGuard>} />
            <Route path="hebdo" element={<FournisseurGuard subpath="hebdo"><Hebdo /></FournisseurGuard>} />
            <Route path="hebdomadaire" element={<FournisseurGuard subpath="hebdomadaire"><Hebdo /></FournisseurGuard>} />
            <Route path="analyse" element={<FournisseurGuard subpath="analyse"><Analyse /></FournisseurGuard>} />
            <Route path="analyse-leads" element={<FournisseurGuard subpath="analyse-leads"><Analyse /></FournisseurGuard>} />
            <Route path="gammes" element={<FournisseurGuard subpath="gammes"><Gammes /></FournisseurGuard>} />
            <Route path="ages" element={<FournisseurGuard subpath="ages"><Ages /></FournisseurGuard>} />
            <Route path="tranches-age" element={<FournisseurGuard subpath="tranches-age"><Ages /></FournisseurGuard>} />
            <Route path="pipeline" element={<FournisseurGuard subpath="pipeline"><Pipeline /></FournisseurGuard>} />
            <Route path="entonnoir" element={<FournisseurGuard subpath="entonnoir"><Entonnoir /></FournisseurGuard>} />
            <Route path="statuts" element={<FournisseurGuard subpath="statuts"><Statuts /></FournisseurGuard>} />
            <Route path="alertes" element={<FournisseurGuard subpath="alertes"><Alertes /></FournisseurGuard>} />
            <Route path="personae" element={<FournisseurGuard subpath="personae"><Personae /></FournisseurGuard>} />
            <Route path="fournisseur" element={<FournisseurGuard subpath="fournisseur"><Fournisseur /></FournisseurGuard>} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </Suspense>
      </div>
    </PerfLeadFiltersProvider>
  )
}

export default PerfLeadModule
