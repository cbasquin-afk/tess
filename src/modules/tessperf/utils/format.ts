import type { FeuTricolore } from '../types'

export const fmtEUR = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

export const fmtEURDecimal = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n)
}

export const fmtPct = (n: number | null | undefined, decimals = 1): string => {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n.toFixed(decimals).replace('.', ',')} %`
}

export const fmtInt = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

export const fmtRatio = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return '—'
  // Reçoit un ratio 0..1, affiche en %
  return fmtPct(n * 100)
}

/**
 * Feu tricolore basé sur ratio realise / cible.
 * - ≥ 85% → vert
 * - 50%-85% → orange
 * - < 50% → rouge
 */
export const feuTricolore = (
  realise: number,
  cible: number,
): FeuTricolore => {
  if (cible <= 0) return 'neutre'
  const ratio = realise / cible
  if (ratio >= 0.85) return 'vert'
  if (ratio >= 0.5) return 'orange'
  return 'rouge'
}

export const FEU_COLORS: Record<FeuTricolore, { fg: string; bg: string; border: string }> = {
  vert: { fg: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
  orange: { fg: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  rouge: { fg: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
  neutre: { fg: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
}

export const fmtMoisLibelle = (annee: number, mois: number): string => {
  const d = new Date(annee, mois - 1, 1)
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export const monthInputFromAnneeMois = (annee: number, mois: number): string =>
  `${annee}-${String(mois).padStart(2, '0')}`

export const parseMonthInput = (s: string): { annee: number; mois: number } | null => {
  const m = s.match(/^(\d{4})-(\d{2})$/)
  if (!m) return null
  return { annee: Number(m[1]), mois: Number(m[2]) }
}

export const fmtDateShort = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export const fmtJourLong = (iso: string): string => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
