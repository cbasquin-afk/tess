import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/shared/supabase'
import type {
  Compagnie,
  OffreRemuneration,
  Protocole,
  ConditionReprise,
} from '../types'

export function usePartenaires() {
  const [compagnies, setCompagnies] = useState<Compagnie[]>([])
  const [offres, setOffres] = useState<OffreRemuneration[]>([])
  const [protocoles, setProtocoles] = useState<Protocole[]>([])
  const [reprises, setReprises] = useState<ConditionReprise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [rComp, rOffres, rProto, rRepr] = await Promise.all([
        supabase.from('partenaires_v_compagnies').select('*').order('nom'),
        supabase.from('partenaires_v_offres_remuneration').select('*').order('compagnie_id'),
        supabase.from('partenaires_v_protocoles').select('*').order('compagnie_id'),
        supabase.from('partenaires_v_conditions_reprise').select('*').order('compagnie_id'),
      ])
      if (rComp.error) throw new Error(`compagnies: ${rComp.error.message}`)
      if (rOffres.error) throw new Error(`offres_remuneration: ${rOffres.error.message}`)
      if (rProto.error) throw new Error(`protocoles: ${rProto.error.message}`)
      if (rRepr.error) throw new Error(`conditions_reprise: ${rRepr.error.message}`)

      setCompagnies((rComp.data ?? []) as Compagnie[])
      setOffres((rOffres.data ?? []) as OffreRemuneration[])
      setProtocoles((rProto.data ?? []) as Protocole[])
      setReprises((rRepr.data ?? []) as ConditionReprise[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { compagnies, offres, protocoles, reprises, loading, error, reload }
}
