import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { lazyWithRetry } from '@/shared/lazyWithRetry'
import { RebuildSiteButton } from './components/RebuildSiteButton'

const Liste = lazyWithRetry(() => import('./views/Liste'))
const Alertes = lazyWithRetry(() => import('./views/Alertes'))
const Edit = lazyWithRetry(() => import('./views/Edit'))
const Statut = lazyWithRetry(() => import('./views/Statut'))

function AnnuaireModule() {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '12px 24px 0',
        }}
      >
        <RebuildSiteButton />
      </div>
      <Suspense
        fallback={
          <div style={{ color: '#64748b', fontSize: 14, padding: 24 }}>
            Chargement Annuaire…
          </div>
        }
      >
        <Routes>
          <Route index element={<Liste />} />
          {/* /alertes doit être déclaré AVANT /:slug pour éviter le catch */}
          <Route path="alertes" element={<Alertes />} />
          <Route path="statut" element={<Statut />} />
          <Route path=":slug" element={<Edit />} />
          <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default AnnuaireModule
