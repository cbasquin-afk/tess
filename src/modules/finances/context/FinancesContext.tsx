import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchAllCommissions, fetchContratsLean } from '../api'
import type {
  CAMensuel,
  CAParCommercial,
  CommissionRow,
  ContratLean,
} from '../types'

interface FinancesCtx {
  commissions: CommissionRow[]
  contrats: ContratLean[]
  contratMap: Map<string, ContratLean>
  caMensuel: CAMensuel[]
  caParCommercial: CAParCommercial[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

const Ctx = createContext<FinancesCtx | null>(null)

interface ProviderProps {
  children: ReactNode
}

export function FinancesProvider({ children }: ProviderProps) {
  const [commissions, setCommissions] = useState<CommissionRow[]>([])
  const [contrats, setContrats] = useState<ContratLean[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [coms, cons] = await Promise.all([
        fetchAllCommissions(),
        fetchContratsLean(),
      ])
      setCommissions(coms)
      setContrats(cons)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // Map id → ContratLean pour join O(1)
  const contratMap = useMemo(() => {
    const m = new Map<string, ContratLean>()
    for (const c of contrats) m.set(c.id, c)
    return m
  }, [contrats])

  // Agrégation CA mensuel global
  const caMensuel = useMemo<CAMensuel[]>(() => {
    const map = new Map<string, CAMensuel>()
    for (const r of commissions) {
      const key = `${r.annee}-${String(r.mois).padStart(2, '0')}`
      const ex = map.get(key) ?? {
        annee: r.annee,
        mois: r.mois,
        ca_societe: 0,
        ca_mandataire: 0,
        frais: 0,
        nb_lignes: 0,
      }
      ex.ca_societe += r.montant_com_societe
      ex.ca_mandataire += r.montant_com_mandataire
      ex.frais += r.montant_frais
      ex.nb_lignes += 1
      map.set(key, ex)
    }
    return Array.from(map.values()).sort(
      (a, b) => b.annee - a.annee || b.mois - a.mois,
    )
  }, [commissions])

  // Agrégation CA par commercial × mois
  const caParCommercial = useMemo<CAParCommercial[]>(() => {
    const map = new Map<string, CAParCommercial>()
    for (const r of commissions) {
      const c = contratMap.get(r.contrat_id)
      const prenom = c?.commercial_prenom ?? 'Autre'
      const key = `${prenom}|${r.annee}-${String(r.mois).padStart(2, '0')}`
      const ex = map.get(key) ?? {
        commercial_prenom: prenom,
        annee: r.annee,
        mois: r.mois,
        ca_societe: 0,
        ca_mandataire: 0,
        frais: 0,
        nb_contrats: 0,
      }
      ex.ca_societe += r.montant_com_societe
      ex.ca_mandataire += r.montant_com_mandataire
      ex.frais += r.montant_frais
      ex.nb_contrats += 1
      map.set(key, ex)
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        b.annee - a.annee ||
        b.mois - a.mois ||
        a.commercial_prenom.localeCompare(b.commercial_prenom, 'fr'),
    )
  }, [commissions, contratMap])

  const value = useMemo<FinancesCtx>(
    () => ({
      commissions,
      contrats,
      contratMap,
      caMensuel,
      caParCommercial,
      loading,
      error,
      reload,
    }),
    [
      commissions,
      contrats,
      contratMap,
      caMensuel,
      caParCommercial,
      loading,
      error,
      reload,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useFinancesCtx(): FinancesCtx {
  const ctx = useContext(Ctx)
  if (!ctx) {
    throw new Error(
      'useFinancesCtx doit être utilisé dans un <FinancesProvider>',
    )
  }
  return ctx
}
