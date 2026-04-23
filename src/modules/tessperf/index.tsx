import { Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { lazyWithRetry } from '@/shared/lazyWithRetry'

const DashboardEquipe = lazyWithRetry(() => import('./views/DashboardEquipe'))
const DashboardCommercial = lazyWithRetry(() => import('./views/DashboardCommercial'))
const WeeklyEquipe = lazyWithRetry(() => import('./views/WeeklyEquipe'))
const WeeklyCommercial = lazyWithRetry(() => import('./views/WeeklyCommercial'))

/**
 * Garde-fou anti-boucle : si l'URL accumule plus de 4 segments sous /tessperf
 * (ex. /tessperf/hebdomadaire/mensuel/equipe/mensuel/equipe/...), on coupe
 * net et on revient à la home du module. Protège contre toute future
 * résolution de Navigate relative qui aurait pu nous échapper.
 */
function SafetyNet({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const segments = location.pathname
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
  // segments[0] === 'tessperf' ; on tolère jusqu'à 4 segments après :
  // tessperf / mensuel / commercial / :id → 4 segments utiles.
  if (segments.length > 5) {
    return <Navigate to="/tessperf/mensuel/equipe" replace />
  }
  return <>{children}</>
}

function TessPerfModule() {
  return (
    <Suspense
      fallback={
        <div style={{ color: '#64748b', fontSize: 14, padding: 24 }}>
          Chargement TessPerf…
        </div>
      }
    >
      <SafetyNet>
        <Routes>
          {/* index = /tessperf → renvoie vers la home mensuel/equipe */}
          <Route index element={<Navigate to="/tessperf/mensuel/equipe" replace />} />

          {/* Sous-onglets sans scope → redirigent en ABSOLU (pas relatif,
              sinon l'URL empile les segments quand on est déjà profond). */}
          <Route path="mensuel" element={<Navigate to="/tessperf/mensuel/equipe" replace />} />
          <Route path="hebdomadaire" element={<Navigate to="/tessperf/hebdomadaire/equipe" replace />} />

          {/* Routes fonctionnelles */}
          <Route path="mensuel/equipe" element={<DashboardEquipe />} />
          <Route path="mensuel/commercial/:id" element={<DashboardCommercial />} />
          <Route path="hebdomadaire/equipe" element={<WeeklyEquipe />} />
          <Route path="hebdomadaire/commercial/:id" element={<WeeklyCommercial />} />

          {/* Legacy v1 : ancienne route plate */}
          <Route path="commercial/:id" element={<Navigate to="/tessperf/mensuel/equipe" replace />} />

          {/* Catch-all : TOUJOURS en absolu pour ne pas empiler */}
          <Route path="*" element={<Navigate to="/tessperf/mensuel/equipe" replace />} />
        </Routes>
      </SafetyNet>
    </Suspense>
  )
}

export default TessPerfModule
