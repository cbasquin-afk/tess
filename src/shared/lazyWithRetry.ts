import { lazy } from 'react'

/**
 * Wrapper autour de React.lazy pour auto-reload si le chunk dynamique
 * est introuvable (erreur courante après un redéploiement Vite quand
 * le navigateur a un ancien manifest en cache).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry(
  factory: () => Promise<{ default: React.ComponentType<any> }>,
) {
  return lazy(() =>
    factory().catch(() => {
      window.location.reload()
      // Ne jamais resolve — le reload prend le relais
      return new Promise<never>(() => {})
    }),
  )
}
