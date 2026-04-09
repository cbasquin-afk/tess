/**
 * Tokens partagés pour l'harmonisation UI des tableaux Finances.
 * Importés par Dashboard, CA, Mandataires, Portefeuille, Versements.
 */

// ── Fonts ──────────────────────────────────────────────────
export const MONO = "'JetBrains Mono', ui-monospace, monospace"

// ── Table base ─────────────────────────────────────────────
export const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  fontSize: 13,
}

export const trHead: React.CSSProperties = {
  color: '#64748b',
  fontSize: 11,
  fontWeight: 600,
}

export const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '1px solid #e5e7eb',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export const thRight: React.CSSProperties = { ...th, textAlign: 'right' }
export const thCenter: React.CSSProperties = { ...th, textAlign: 'center' }

export const td: React.CSSProperties = {
  padding: '10px 10px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

export const tdRight: React.CSSProperties = { ...td, textAlign: 'right' }
export const tdCenter: React.CSSProperties = { ...td, textAlign: 'center' }

// ── Cellules montant (nombre aligné à droite, JetBrains Mono) ──
export const tdMontant: React.CSSProperties = {
  ...td,
  textAlign: 'right',
  fontFamily: MONO,
}

// ── Footer Total ───────────────────────────────────────────
export const trFooter: React.CSSProperties = {
  background: '#f8fafc',
  borderTop: '2px solid #cbd5e1',
  fontWeight: 700,
}

export const tdFooterLabel: React.CSSProperties = {
  ...td,
  color: '#0f172a',
  fontWeight: 700,
}

export const tdFooterMontant: React.CSSProperties = {
  ...tdMontant,
  color: '#00C18B',
  fontWeight: 700,
}

// ── Ligne body ─────────────────────────────────────────────
export const trBody: React.CSSProperties = {
  borderTop: '1px solid #f1f5f9',
}
