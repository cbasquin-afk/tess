import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export interface PerfLeadFilters {
  dateFrom: string // 'yyyy-MM-dd' ou '' = pas de filtre
  dateTo: string
  commercial: string // '' = tous, '__pioche__' = pioche
  categorie: string // '' = toutes
  origine: string // '' = toutes
  typeContrat: string // '' = toutes verticales
}

const DEFAULT_FILTERS: PerfLeadFilters = {
  dateFrom: '',
  dateTo: '',
  commercial: '',
  categorie: '',
  origine: '',
  typeContrat: '',
}

interface FiltersContextValue {
  filters: PerfLeadFilters
  setFilters: (patch: Partial<PerfLeadFilters>) => void
  resetFilters: () => void
}

const FiltersContext = createContext<FiltersContextValue | undefined>(undefined)

interface ProviderProps {
  children: ReactNode
}

export function PerfLeadFiltersProvider({ children }: ProviderProps) {
  const [filters, setFiltersState] =
    useState<PerfLeadFilters>(DEFAULT_FILTERS)

  const setFilters = useCallback((patch: Partial<PerfLeadFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS)
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
