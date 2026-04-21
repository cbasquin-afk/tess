import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { lazyWithRetry } from '@/shared/lazyWithRetry'

// Le composant vit physiquement sous src/modules/finances/views/ —
// ce module est un simple point d'entrée pour le monter à la racine
// avec un minRole plus permissif que /finances/*.
const Simulateur = lazyWithRetry(() => import('../finances/views/Simulateur'))

function SimulateurModule() {
  return (
    <Suspense
      fallback={
        <div style={{ color: '#64748b', fontSize: 14 }}>
          Chargement Simulateur…
        </div>
      }
    >
      <Routes>
        <Route index element={<Simulateur />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </Suspense>
  )
}

export default SimulateurModule
