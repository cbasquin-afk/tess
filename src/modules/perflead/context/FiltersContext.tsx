import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { format, startOfYear } from 'date-fns'

export interface PerfLeadFilters {
  dateFrom: string // 'yyyy-MM-dd'
  dateTo: string
  commercial: string // '' = tous
  categorie: string // '' = toutes
  origine: string // '' = toutes
  typeContrat: string // '' = toutes verticales
}

interface FiltersContextValue {
  filters: PerfLeadFilters
  setFilters: (patch: Partial<PerfLeadFilters>) => void
  resetFilters: () => void
}

function defaultFilters(): PerfLeadFilters {
  const now = new Date()
  return {
    dateFrom: format(startOfYear(now), 'yyyy-MM-dd'),
    dateTo: format(now, 'yyyy-MM-dd'),
    commercial: '',
    categorie: '',
    origine: '',
    typeContrat: '',
  }
}

const FiltersContext = createContext<FiltersContextValue | undefined>(undefined)

interface ProviderProps {
  children: ReactNode
}

export function PerfLeadFiltersProvider({ children }: ProviderProps) {
  const [filters, setFiltersState] = useState<PerfLeadFilters>(defaultFilters)

  const setFilters = useCallback((patch: Partial<PerfLeadFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters())
  }, [])

  const value = useMemo<FiltersContextValue>(
    () => ({ filters, setFilters, resetFilters }),
    [filters, setFilters, resetFilters],
  )

  return (
    <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
  )
}

export function usePerfLeadFilters(): FiltersContextValue {
  const ctx = useContext(FiltersContext)
  if (!ctx) {
    throw new Error(
      'usePerfLeadFilters doit être utilisé dans un <PerfLeadFiltersProvider>',
    )
  }
  return ctx
}
