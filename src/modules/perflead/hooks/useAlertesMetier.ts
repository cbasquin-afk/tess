import { useMemo } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import { useStats } from './useStats'
import type { Lead } from '../types'

// ── Constantes métier (alignées sur le natif config.js) ──────────
const INEXPLOITABLE_STATUTS = new Set<string>([
  'Inexploitable (Faux numéro)',
  'Inexploitable (Numéro non attribué)',
])

const STATUT_J30 = 'Lead de plus de 30 jours'

const COMMERCIAUX = [
  'Christopher BASQUIN',
  'Charlotte BOCOGNANO',
  'Cheyenne DEBENATH',
] as const

// ── Seuils ───────────────────────────────────────────────────────
export const SEUILS = {
  TX_TRANSFO_MIN: 12, // %
  TX_INEXPL_MAX: 12, // %
  PM_MIN: 100, // €
  PM_ATTENTION: 80, // € (zone d'attention 80-100)
  ECART_COMM_MAX: 5, // pts d'écart de tx conversion entre commerciaux
  LEADS_BLOQUE_JOURS: 14, // jours sans modif → bloqué
  NRP_RECENT_JOURS: 7, // NRP < 7j = relance possible
} as const

// ── Types exposés ────────────────────────────────────────────────
export type AlerteLevel = 'critique' | 'attention' | 'info'

export interface AlerteMetier {
  id: string
  level: AlerteLevel
  titre: string
  detail: string
  valeur?: string
  action?: string
  lien?: { label: string; path: string }
}

export interface SeuilContractuel {
  label: string
  value: string
  hint: string
  seuilLabel: string
  ok: boolean
  note?: string
}

export interface AlertesData {
  seuils: SeuilContractuel[]
  critiques: AlerteMetier[]
  attention: AlerteMetier[]
  info: AlerteMetier[]
}

// ── Helpers ──────────────────────────────────────────────────────
function joursDepuis(iso: string | null, today: Date): number {
  if (!iso) return 0
  try {
    return differenceInDays(today, parseISO(iso.slice(0, 10)))
  } catch {
    return 0
  }
}

function isPioche(l: Lead): boolean {
  return !l.attribution || l.attribution === '< Pioche >'
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

// ── Hook ─────────────────────────────────────────────────────────
export function useAlertesMetier() {
  const { leads, stats, loading, error } = useStats()

  const data = useMemo<AlertesData>(() => {
    const today = new Date()
    const total = stats.total

    // Métriques de base
    const txTransfo = stats.txTransformation
    const pmMoyen = stats.pmMoyen
    const nbContrats = stats.totalContrats

    // Inexploitable basé sur statut exact (pas catégorie) — fidèle au natif
    const nbInexpl = leads.filter((l) => INEXPLOITABLE_STATUTS.has(l.statut))
      .length
    const txInexpl = total > 0 ? (nbInexpl / total) * 100 : 0

    // Leads +30j (statut explicite)
    const leads30j = leads.filter((l) => l.statut === STATUT_J30)
    const nbJ30 = leads30j.length

    // Leads "En cours" bloqués (modif > 14j)
    const bloques = leads.filter(
      (l) =>
        l.categorie === 'En cours' &&
        joursDepuis(l.derniere_modification, today) >
          SEUILS.LEADS_BLOQUE_JOURS,
    )
    const nbBloques = bloques.length

    // Pioche
    const nbPioche = leads.filter(isPioche).length

    // NRP récents
    const nbNrpRecent = leads.filter(
      (l) =>
        l.categorie === 'NRP' &&
        joursDepuis(l.derniere_modification, today) <= SEUILS.NRP_RECENT_JOURS,
    ).length

    // Tx conversion par commercial (sur le pool des 3 vrais)
    interface CommStat {
      nom: string
      prenom: string
      contrats: number
      enCours: number
      txConv: number
    }
    const commStats: CommStat[] = COMMERCIAUX.map((nom) => {
      const sub = leads.filter((l) => l.attribution === nom)
      const c = sub.filter((l) => l.categorie === 'Contrat').length
      const ec = sub.filter((l) => l.categorie === 'En cours').length
      const pipe = c + ec
      return {
        nom,
        prenom: nom.split(' ')[0] ?? nom,
        contrats: c,
        enCours: ec,
        txConv: pipe > 0 ? (c / pipe) * 100 : 0,
      }
    }).filter((c) => c.contrats + c.enCours > 5)

    let ecartComm: { best: CommStat; worst: CommStat; diff: number } | null =
      null
    if (commStats.length >= 2) {
      const sorted = [...commStats].sort((a, b) => b.txConv - a.txConv)
      const best = sorted[0]!
      const worst = sorted[sorted.length - 1]!
      const diff = best.txConv - worst.txConv
      if (diff > SEUILS.ECART_COMM_MAX) {
        ecartComm = { best, worst, diff }
      }
    }

    // ── Section 1 : Seuils contractuels ─────────────────────
    const seuils: SeuilContractuel[] = [
      {
        label: 'Taux de transformation',
        value: `${txTransfo.toFixed(1)}%`,
        hint: `${fmt(nbContrats)} contrats / ${fmt(total)} leads`,
        seuilLabel: `min ${SEUILS.TX_TRANSFO_MIN}%`,
        ok: txTransfo >= SEUILS.TX_TRANSFO_MIN,
        note: 'Contrats ÷ tous leads (y compris NRP, inexploitable)',
      },
      {
        label: 'Leads inexploitables',
        value: `${txInexpl.toFixed(1)}%`,
        hint: `${fmt(nbInexpl)} leads (faux n° + non attribués)`,
        seuilLabel: `max ${SEUILS.TX_INEXPL_MAX}%`,
        ok: txInexpl <= SEUILS.TX_INEXPL_MAX,
        note: 'Seuil contractuel fournisseur',
      },
      {
        label: 'Panier moyen',
        value: `${pmMoyen.toFixed(0)}€`,
        hint: `sur ${fmt(nbContrats)} contrats`,
        seuilLabel: `min ${SEUILS.PM_MIN}€`,
        ok: pmMoyen >= SEUILS.PM_MIN,
        note:
          pmMoyen < 108 && pmMoyen >= SEUILS.PM_MIN
            ? '⚠ Marge fine — surveiller'
            : undefined,
      },
    ]

    // ── Section 2 : Alertes critiques ───────────────────────
    const critiques: AlerteMetier[] = []

    if (txTransfo < SEUILS.TX_TRANSFO_MIN) {
      const delta = (SEUILS.TX_TRANSFO_MIN - txTransfo).toFixed(1)
      critiques.push({
        id: 'tx-transfo-bas',
        level: 'critique',
        titre: 'Taux de transformation sous le seuil contractuel',
        valeur: `${txTransfo.toFixed(1)}%`,
        detail: `Seuil minimum : ${SEUILS.TX_TRANSFO_MIN}%. Manque ${delta} pts. ${fmt(nbContrats)} contrats sur ${fmt(total)} leads.`,
        action:
          'Analyser les causes de perte et renforcer le suivi des leads en cours.',
      })
    }

    if (txInexpl > SEUILS.TX_INEXPL_MAX) {
      critiques.push({
        id: 'tx-inexpl-haut',
        level: 'critique',
        titre: 'Taux de leads inexploitables dépasse le seuil',
        valeur: `${txInexpl.toFixed(1)}%`,
        detail: `Seuil max : ${SEUILS.TX_INEXPL_MAX}%. ${fmt(nbInexpl)} leads inexploitables sur ${fmt(total)} (faux n° + non attribués).`,
        action:
          'Signaler au fournisseur pour amélioration de la qualité des données.',
      })
    }

    if (nbJ30 > 0) {
      critiques.push({
        id: 'leads-30j',
        level: 'critique',
        titre: `Lead${nbJ30 > 1 ? 's' : ''} +30 jours non clôturé${nbJ30 > 1 ? 's' : ''}`,
        valeur: fmt(nbJ30),
        detail:
          'Ces leads sont au statut "Lead de plus de 30 jours" et encombrent le pipeline. Ils faussent les stats de conversion.',
        action: 'Relancer sous 48h ou classer définitivement en perdu.',
        lien: { label: 'Voir le pipeline', path: '/perflead/pipeline' },
      })
    }

    // ── Section 3 : Points d'attention ──────────────────────
    const attention: AlerteMetier[] = []

    if (pmMoyen >= SEUILS.PM_ATTENTION && pmMoyen < SEUILS.PM_MIN) {
      attention.push({
        id: 'pm-zone-attention',
        level: 'attention',
        titre: 'Panier moyen sous le seuil contractuel',
        valeur: `${pmMoyen.toFixed(0)}€`,
        detail: `Zone d'attention ${SEUILS.PM_ATTENTION}€-${SEUILS.PM_MIN}€. Le seuil contractuel est ${SEUILS.PM_MIN}€.`,
        action:
          'Favoriser les compagnies à PM élevé (APRIL, ALPTIS) sur les prochains dossiers.',
      })
    } else if (
      pmMoyen >= SEUILS.PM_MIN &&
      pmMoyen < SEUILS.PM_MIN + 8
    ) {
      attention.push({
        id: 'pm-marge-fine',
        level: 'attention',
        titre: 'Panier moyen proche du seuil contractuel',
        valeur: `${pmMoyen.toFixed(0)}€`,
        detail:
          'Marge fine au-dessus du seuil 100€. Une mauvaise série peut faire basculer.',
        action: 'Surveiller les prochaines signatures et privilégier les PM élevés.',
      })
    }

    if (ecartComm) {
      attention.push({
        id: 'ecart-commerciaux',
        level: 'attention',
        titre: 'Écart de conversion entre commerciaux',
        valeur: `${ecartComm.diff.toFixed(1)} pts`,
        detail: `Meilleur : ${ecartComm.best.prenom} (${ecartComm.best.txConv.toFixed(1)}%) · Plus bas : ${ecartComm.worst.prenom} (${ecartComm.worst.txConv.toFixed(1)}%).`,
        action:
          'Identifier et partager les bonnes pratiques du meilleur performeur.',
      })
    }

    if (nbBloques > 0) {
      attention.push({
        id: 'leads-bloques',
        level: 'attention',
        titre: `Lead${nbBloques > 1 ? 's' : ''} "En cours" sans modification depuis > ${SEUILS.LEADS_BLOQUE_JOURS}j`,
        valeur: fmt(nbBloques),
        detail:
          'Ces leads sont en pipe mais n\'ont pas été touchés depuis 2 semaines. Risque de perte.',
        action: 'Relancer ou re-qualifier ces leads.',
        lien: { label: 'Voir le pipeline', path: '/perflead/pipeline' },
      })
    }

    // ── Section 4 : Informations ────────────────────────────
    const info: AlerteMetier[] = []

    if (nbPioche > 0) {
      info.push({
        id: 'pioche',
        level: 'info',
        titre: `${fmt(nbPioche)} lead${nbPioche > 1 ? 's' : ''} disponible${nbPioche > 1 ? 's' : ''} en pioche`,
        valeur: fmt(nbPioche),
        detail:
          'Pot commun de retravail — ces leads ne sont attribués à personne.',
        action: 'À redistribuer ou prendre en pioche pour relance.',
        lien: { label: 'Voir la pioche', path: '/perflead/pipeline' },
      })
    }

    if (nbNrpRecent > 0) {
      info.push({
        id: 'nrp-recent',
        level: 'info',
        titre: `${fmt(nbNrpRecent)} NRP créé${nbNrpRecent > 1 ? 's' : ''} cette semaine`,
        valeur: fmt(nbNrpRecent),
        detail: `NRP de moins de ${SEUILS.NRP_RECENT_JOURS} jours — 2ᵉ tentative encore possible avant bascule en Lead +30j.`,
        action: 'Prévoir une 2ᵉ tentative à J+3 ou J+7.',
      })
    }

    return { seuils, critiques, attention, info }
  }, [leads, stats])

  return { data, loading, error }
}
