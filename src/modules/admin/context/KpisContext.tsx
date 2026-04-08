import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { fetchKpis } from '../api'
import type { TadminKpis } from '../types'

interface KpisCtx {
  kpis: TadminKpis | null
  loading: boolean
}

const Ctx = createContext<KpisCtx>({ kpis: null, loading: false })

interface ProviderProps {
  children: ReactNode
  refreshKey: number
}

export function KpisProvider({ children, refreshKey }: ProviderProps) {
  const [kpis, setKpis] = useState<TadminKpis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchKpis()
      .then((d) => {
        if (!cancelled) setKpis(d)
      })
      .catch(() => {
        // silencieux — un fail KPIs ne doit pas casser le module
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  return <Ctx.Provider value={{ kpis, loading }}>{children}</Ctx.Provider>
}

export function useAdminKpis(): KpisCtx {
  return useContext(Ctx)
}
