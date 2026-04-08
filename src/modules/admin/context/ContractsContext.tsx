import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { fetchContrats } from '../api'
import type { TadminContrat } from '../types'

interface ContractsCtx {
  contrats: TadminContrat[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const Ctx = createContext<ContractsCtx | null>(null)

interface ProviderProps {
  children: ReactNode
}

export function ContractsProvider({ children }: ProviderProps) {
  const [contrats, setContrats] = useState<TadminContrat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setContrats(await fetchContrats())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <Ctx.Provider value={{ contrats, loading, error, reload }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAdminContrats(): ContractsCtx {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error(
      'useAdminContrats doit être utilisé dans un <ContractsProvider>',
    )
  }
  return ctx
}
