import { useMemo } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import type { AlerteLead, AlerteType, Lead } from '../types'

interface Buckets {
  nrp: AlerteLead[]
  bloque: AlerteLead[]
  froid: AlerteLead[]
}

export function useAlertes(leads: Lead[]): Buckets {
  return useMemo(() => {
    const today = new Date()
    const buckets: Buckets = { nrp: [], bloque: [], froid: [] }

    function makeAlerte(l: Lead, jours: number, type: AlerteType): AlerteLead {
      return {
        identifiant_projet: l.identifiant_projet,
        prenom: l.contact_prenom ?? l.prenom,
        nom: l.contact_nom ?? l.nom,
        telephone: l.telephone,
        statut: l.statut,
        categorie: l.categorie,
        attribution: l.attribution,
        derniere_modification: l.derniere_modification,
        joursDepuisModif: jours,
        url_projet: l.url_projet,
        typeAlerte: type,
      }
    }

    function joursDepuisModif(l: Lead): number {
      if (!l.derniere_modification) return 0
      try {
        return differenceInDays(today, parseISO(l.derniere_modification.slice(0, 10)))
      } catch {
        return 0
      }
    }

    function joursDepuisCreation(l: Lead): number {
      if (!l.date_creation) return 0
      try {
        return differenceInDays(today, parseISO(l.date_creation.slice(0, 10)))
      } catch {
        return 0
      }
    }

    for (const l of leads) {
      const jModif = joursDepuisModif(l)
      const jCrea = joursDepuisCreation(l)

      // NRP à relancer : NRP, modifié il y a plus de 7 jours
      if (l.categorie === 'NRP' && jModif > 7) {
        buckets.nrp.push(makeAlerte(l, jModif, 'NRP_relance'))
        continue
      }

      // En cours bloqué : En cours, modifié il y a plus de 14 jours
      if (l.categorie === 'En cours' && jModif > 14) {
        buckets.bloque.push(makeAlerte(l, jModif, 'en_cours_bloque'))
        continue
      }

      // Lead froid : En cours, créé il y a plus de 30 jours et modifié il y a > 14j
      if (l.categorie === 'En cours' && jCrea > 30 && jModif > 14) {
        buckets.froid.push(makeAlerte(l, jModif, 'lead_froid'))
      }
    }

    const sortDesc = (a: AlerteLead, b: AlerteLead) =>
      b.joursDepuisModif - a.joursDepuisModif
    buckets.nrp.sort(sortDesc)
    buckets.bloque.sort(sortDesc)
    buckets.froid.sort(sortDesc)

    return buckets
  }, [leads])
}
