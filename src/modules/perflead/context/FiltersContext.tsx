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

// Renvoie le 1er et le dernier jour du mois courant au format yyyy-MM-dd.
// Utilisé pour pré-remplir les filtres dates au mount du Provider.
function currentMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const fmt = (d: Date) =>
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  return { dateFrom: fmt(first), dateTo: fmt(last) }
}

function buildDefaults(): PerfLeadFilters {
  return {
    ...currentMonthRange(),
    commercial: '',
    categorie: '',
    origine: '',
    typeContrat: '',
  }
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
  const [filters, setFiltersState] = useState<PerfLeadFilters>(buildDefaults)

  const setFilters = useCallback((patch: Partial<PerfLeadFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState(buildDefaults())
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
