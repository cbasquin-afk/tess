import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchMarqueStatut,
  setMarquePartenariat,
  setMarqueStatutVerticale,
} from '../api'
import type {
  ActionStatut,
  MarqueStatutRow,
  StatutCellule,
  VerticaleStatut,
} from '../types'
import {
  VERTICALES_STATUT,
  VERTICALE_STATUT_LABELS,
  VERTICALE_STATUT_SHORT,
} from '../types'

const C = {
  text: '#1f2937',
  muted: '#6b7280',
  border: '#e5e7eb',
  surface: '#ffffff',
  surfaceAlt: '#f9fafb',
  okBg: '#d1fae5',
  okFg: '#065f46',
  draftBg: '#fef3c7',
  draftFg: '#92400e',
  warnBg: '#fee2e2',
  warnFg: '#991b1b',
  primaryBg: '#1f3a8a',
}

const S = {
  page: { padding: 24, color: C.text, fontSize: 14 } as const,
  h1: { fontSize: 22, fontWeight: 600, margin: '0 0 4px' } as const,
  sub: { color: C.muted, margin: '0 0 20px' } as const,
  toolbar: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
    alignItems: 'center',
  } as const,
  input: {
    height: 34,
    padding: '0 10px',
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    background: C.surface,
    fontSize: 13,
    minWidth: 180,
  } as const,
  select: {
    height: 34,
    padding: '0 28px 0 10px',
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    background: C.surface,
    fontSize: 13,
    cursor: 'pointer',
  } as const,
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginBottom: 16,
  } as const,
  stat: {
    background: C.surfaceAlt,
    padding: '12px 14px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
  } as const,
  statLabel: { fontSize: 11, color: C.muted, textTransform: 'uppercase' } as const,
  statValue: { fontSize: 22, fontWeight: 600, marginTop: 2 } as const,
  table: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: 0,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    tableLayout: 'fixed',
  } as const,
  th: {
    textAlign: 'left',
    padding: '10px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: C.muted,
    background: C.surfaceAlt,
    borderBottom: `1px solid ${C.border}`,
    textTransform: 'uppercase',
  } as const,
  td: {
    padding: '8px 10px',
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: 'middle',
  } as const,
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 24,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    userSelect: 'none',
    border: '1px solid transparent',
  } as const,
  popover: {
    position: 'absolute',
    zIndex: 100,
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
    padding: 4,
    minWidth: 160,
  } as const,
  popBtn: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '8px 10px',
    fontSize: 13,
    background: 'transparent',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    color: C.text,
  } as const,
  linkBtn: {
    display: 'inline-block',
    padding: '4px 8px',
    fontSize: 12,
    color: C.primaryBg,
    textDecoration: 'none',
    border: `1px solid ${C.border}`,
    borderRadius: 4,
  } as const,
}

type MarqueConsolidee = {
  slug: string
  name: string
  category: string | null
  est_partenaire: boolean
  verticales: Partial<Record<VerticaleStatut, MarqueStatutRow>>
}

function consolider(rows: MarqueStatutRow[]): MarqueConsolidee[] {
  const map = new Map<string, MarqueConsolidee>()
  for (const r of rows) {
    let m = map.get(r.slug)
    if (!m) {
      m = {
        slug: r.slug,
        name: r.name,
        category: r.category,
        est_partenaire: r.est_partenaire,
        verticales: {},
      }
      map.set(r.slug, m)
    }
    m.verticales[r.verticale] = r
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

function pillColors(s: StatutCellule | undefined): {
  bg: string
  fg: string
  border: string
  label: string
} {
  if (s === 'publie') return { bg: C.okBg, fg: C.okFg, border: 'transparent', label: '✓' }
  if (s === 'brouillon')
    return { bg: C.draftBg, fg: C.draftFg, border: 'transparent', label: '⦿' }
  if (s === 'incoherent')
    return { bg: C.warnBg, fg: C.warnFg, border: C.warnFg, label: '!' }
  return { bg: C.surfaceAlt, fg: C.muted, border: 'transparent', label: '−' }
}

function statutTitle(cell: MarqueStatutRow | undefined): string {
  if (!cell) return 'Non couverte'
  if (cell.statut === 'publie') return 'Publiée (core actif + éditorial + indexable)'
  if (cell.statut === 'brouillon') return 'Brouillon (noindex volontaire)'
  if (cell.statut === 'incoherent') {
    if (cell.type_incoherence === 'coquille') return 'Incohérence : page active sans éditorial'
    if (cell.type_incoherence === 'orphelin') return 'Incohérence : éditorial prêt, page non routée'
    return 'Incohérence'
  }
  return 'Non couverte'
}

type PopoverState = { slug: string; verticale: VerticaleStatut } | null

export default function Statut() {
  const [rows, setRows] = useState<MarqueStatutRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [filtrePart, setFiltrePart] = useState<'tous' | 'oui' | 'non'>('tous')
  const [filtreCat, setFiltreCat] = useState<string>('toutes')
  const [filtreStatut, setFiltreStatut] = useState<'tous' | 'incoherent' | 'publie'>('tous')

  const [popover, setPopover] = useState<PopoverState>(null)
  const popoverAnchorRef = useRef<HTMLDivElement | null>(null)

  async function recharger() {
    try {
      setLoading(true)
      const data = await fetchMarqueStatut()
      setRows(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchMarqueStatut()
        if (!cancelled) setRows(data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!popover) return
    // On click (pas mousedown) pour laisser le onMouseDown du popover s'exécuter
    // avant la fermeture. stopPropagation() sur le popover empêche ce handler
    // de fermer si on clique dedans.
    function onDocClick(ev: MouseEvent) {
      const el = popoverAnchorRef.current
      if (el && !el.contains(ev.target as Node)) setPopover(null)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [popover])

  const consolidees = useMemo(() => consolider(rows), [rows])
  const categories = useMemo(() => {
    const s = new Set<string>()
    for (const m of consolidees) if (m.category) s.add(m.category)
    return Array.from(s).sort()
  }, [consolidees])

  const filtrees = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return consolidees.filter((m) => {
      if (qq && !m.name.toLowerCase().includes(qq) && !m.slug.includes(qq)) return false
      if (filtrePart === 'oui' && !m.est_partenaire) return false
      if (filtrePart === 'non' && m.est_partenaire) return false
      if (filtreCat !== 'toutes' && m.category !== filtreCat) return false
      if (filtreStatut !== 'tous') {
        const hasMatch = Object.values(m.verticales).some((v) => v?.statut === filtreStatut)
        if (!hasMatch) return false
      }
      return true
    })
  }, [consolidees, q, filtrePart, filtreCat, filtreStatut])

  const stats = useMemo(() => {
    let publiees = 0, brouillons = 0, incoherences = 0
    for (const r of rows) {
      if (r.statut === 'publie') publiees++
      else if (r.statut === 'brouillon') brouillons++
      else if (r.statut === 'incoherent') incoherences++
    }
    return { total: consolidees.length, publiees, brouillons, incoherences }
  }, [rows, consolidees])

  async function handleAction(slug: string, verticale: VerticaleStatut, action: ActionStatut) {
    console.log('[annuaire/statut] handleAction ENTRÉE', {
      slug,
      slugLength: slug.length,
      slugJSON: JSON.stringify(slug),
      verticale,
      action,
    })
    const key = `${slug}:${verticale}`
    setBusy(key)
    setPopover(null)
    try {
      console.log('[annuaire/statut] handleAction avant RPC', { slug, verticale, action })
      await setMarqueStatutVerticale(slug, verticale, action)
      console.log('[annuaire/statut] handleAction RPC OK, recharger()…')
      const fresh = await fetchMarqueStatut()
      const before = rows.find((r) => r.slug === slug && r.verticale === verticale)
      const after = fresh.find((r) => r.slug === slug && r.verticale === verticale)
      console.log('[annuaire/statut] recharger() OK — diff sur la cellule', { before, after })
      setRows(fresh)
    } catch (e) {
      console.error('[annuaire/statut] setMarqueStatutVerticale a échoué', e)
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function handlePartenariat(slug: string, value: boolean) {
    setBusy(`${slug}:partenariat`)
    try {
      await setMarquePartenariat(slug, value)
      await recharger()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <div style={S.page}>Chargement…</div>
  if (error) return <div style={S.page}>Erreur : {error}</div>

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Statut des marques</h1>
      <p style={S.sub}>
        Source de vérité unique du partenariat et de la publication par verticale. Les flags{' '}
        <code>core_active</code>, <code>noindex</code> et <code>est_partenaire</code> sont écrits
        de manière atomique via les RPCs Supabase — aucune incohérence ne peut être introduite
        depuis cette interface.
      </p>

      <div style={S.stats}>
        <Stat label="Marques" value={stats.total} />
        <Stat label="Publiées" value={stats.publiees} />
        <Stat label="Brouillons" value={stats.brouillons} />
        <Stat label="Incohérences" value={stats.incoherences} color={stats.incoherences > 0 ? C.warnFg : undefined} />
      </div>

      <div style={S.toolbar}>
        <input style={S.input} placeholder="Rechercher une marque…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={S.select} value={filtrePart} onChange={(e) => setFiltrePart(e.target.value as typeof filtrePart)}>
          <option value="tous">Tous partenariats</option>
          <option value="oui">Partenaires</option>
          <option value="non">Non partenaires</option>
        </select>
        <select style={S.select} value={filtreCat} onChange={(e) => setFiltreCat(e.target.value)}>
          <option value="toutes">Toutes catégories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={S.select} value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value as typeof filtreStatut)}>
          <option value="tous">Tout statut</option>
          <option value="incoherent">Incohérences</option>
          <option value="publie">Publiées</option>
        </select>
        <span style={{ color: C.muted, fontSize: 12, marginLeft: 'auto' }}>
          {filtrees.length} marque{filtrees.length > 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ position: 'relative' }} ref={popoverAnchorRef}>
        <table style={S.table}>
          <colgroup>
            <col style={{ width: 180 }} />
            <col style={{ width: 130 }} />
            {VERTICALES_STATUT.map((v) => <col key={v} style={{ width: 52 }} />)}
            <col style={{ width: 70 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={S.th}>Marque</th>
              <th style={S.th}>Partenariat</th>
              {VERTICALES_STATUT.map((v) => (
                <th key={v} style={S.th} title={VERTICALE_STATUT_LABELS[v]}>
                  {VERTICALE_STATUT_SHORT[v]}
                </th>
              ))}
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {filtrees.map((m) => (
              <tr key={m.slug}>
                <td style={S.td}>
                  <div style={{ fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{m.category ?? '—'}</div>
                </td>
                <td style={S.td}>
                  <select
                    style={{ ...S.select, height: 28, width: '100%' }}
                    disabled={busy === `${m.slug}:partenariat`}
                    value={m.est_partenaire ? 'oui' : 'non'}
                    onChange={(e) => handlePartenariat(m.slug, e.target.value === 'oui')}
                  >
                    <option value="oui">Partenaire</option>
                    <option value="non">Non partenaire</option>
                  </select>
                </td>
                {VERTICALES_STATUT.map((v) => {
                  const cell = m.verticales[v]
                  const col = pillColors(cell?.statut)
                  const key = `${m.slug}:${v}`
                  const isOpen = popover?.slug === m.slug && popover?.verticale === v
                  const isBusy = busy === key
                  return (
                    <td key={v} style={{ ...S.td, textAlign: 'center', position: 'relative' }}>
                      <button
                        type="button"
                        style={{ ...S.pill, background: col.bg, color: col.fg, borderColor: col.border, opacity: isBusy ? 0.5 : 1 }}
                        title={statutTitle(cell)}
                        onClick={(e) => {
                          e.stopPropagation()
                          setPopover(isOpen ? null : { slug: m.slug, verticale: v })
                        }}
                      >
                        {col.label}
                      </button>
                      {isOpen && (
                        <div
                          style={{ ...S.popover, top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)' }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            style={S.popBtn}
                            disabled={!cell?.editorial_existe}
                            onMouseDown={(e) => {
                              console.log('[annuaire/statut] onMouseDown publier', { slug: m.slug, v, disabled: !cell?.editorial_existe })
                              e.preventDefault()
                              e.stopPropagation()
                              void handleAction(m.slug, v, 'publier')
                            }}
                            onClick={(e) => {
                              console.log('[annuaire/statut] onClick publier (fallback)', { slug: m.slug, v })
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                            title={cell?.editorial_existe ? 'Publier cette page' : 'Pas d\u2019éditorial — publication impossible'}
                          >
                            ✓ Publier
                          </button>
                          <button
                            type="button"
                            style={S.popBtn}
                            disabled={!cell?.editorial_existe}
                            onMouseDown={(e) => {
                              console.log('[annuaire/statut] onMouseDown brouillon', { slug: m.slug, v, disabled: !cell?.editorial_existe })
                              e.preventDefault()
                              e.stopPropagation()
                              void handleAction(m.slug, v, 'brouillon')
                            }}
                            onClick={(e) => {
                              console.log('[annuaire/statut] onClick brouillon (fallback)', { slug: m.slug, v })
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                          >
                            ⦿ Brouillon
                          </button>
                          <button
                            type="button"
                            style={S.popBtn}
                            onMouseDown={(e) => {
                              console.log('[annuaire/statut] onMouseDown desactiver', { slug: m.slug, v })
                              e.preventDefault()
                              e.stopPropagation()
                              void handleAction(m.slug, v, 'desactiver')
                            }}
                            onClick={(e) => {
                              console.log('[annuaire/statut] onClick desactiver (fallback)', { slug: m.slug, v })
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                          >
                            ⊘ Désactiver
                          </button>
                        </div>
                      )}
                    </td>
                  )
                })}
                <td style={S.td}>
                  <Link to={`/annuaire/edit/${m.slug}`} style={S.linkBtn} title="Éditer la fiche">✎</Link>
                </td>
              </tr>
            ))}
            {filtrees.length === 0 && (
              <tr>
                <td colSpan={VERTICALES_STATUT.length + 3} style={{ ...S.td, textAlign: 'center', color: C.muted, padding: 24 }}>
                  Aucune marque ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Legende />
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={S.stat}>
      <div style={S.statLabel}>{label}</div>
      <div style={{ ...S.statValue, color: color ?? C.text }}>{value}</div>
    </div>
  )
}

function Legende() {
  const items = [
    { bg: C.okBg, border: 'transparent', label: 'Publiée' },
    { bg: C.draftBg, border: 'transparent', label: 'Brouillon' },
    { bg: C.surfaceAlt, border: C.border, label: 'Non couverte' },
    { bg: C.warnBg, border: C.warnFg, label: 'Incohérence' },
  ]
  return (
    <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 11, color: C.muted, flexWrap: 'wrap' }}>
      {items.map((it) => (
        <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: it.bg, border: `1px solid ${it.border}` }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}
