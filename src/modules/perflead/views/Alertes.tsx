import { useNavigate } from 'react-router-dom'
import {
  useAlertesMetier,
  type AlerteLevel,
  type AlerteMetier,
  type SeuilContractuel,
} from '../hooks/useAlertesMetier'

const LEVEL_STYLES: Record<
  AlerteLevel,
  {
    border: string
    bg: string
    badge: string
    label: string
  }
> = {
  critique: {
    border: '#E24B4A',
    bg: '#fef2f2',
    badge: '#E24B4A',
    label: 'CRITIQUE',
  },
  attention: {
    border: '#BA7517',
    bg: '#fffbeb',
    badge: '#BA7517',
    label: 'ATTENTION',
  },
  info: {
    border: '#378ADD',
    bg: '#eff6ff',
    badge: '#378ADD',
    label: 'INFO',
  },
}

function Alertes() {
  const { data, loading, error } = useAlertesMetier()

  if (loading) return <div style={{ color: '#64748b' }}>Chargement…</div>
  if (error) return <div style={{ color: '#dc2626' }}>Erreur : {error}</div>

  const { seuils, critiques, attention, info } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24 }}>🔔 Alertes</h1>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          Conformité contractuelle et alertes managériales sur la période filtrée.
        </p>
      </div>

      {/* Section 1 — Seuils contractuels */}
      <Section
        title="Seuils contractuels"
        subtitle="Conformité fournisseur sur les 3 indicateurs clés."
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 14,
          }}
        >
          {seuils.map((s) => (
            <SeuilCard key={s.label} seuil={s} />
          ))}
        </div>
      </Section>

      {/* Section 2 — Alertes critiques */}
      <Section
        title="Alertes critiques"
        subtitle="Indicateurs hors seuil ou risques bloquants."
        countBadge={
          critiques.length > 0
            ? { value: critiques.length, color: '#E24B4A' }
            : null
        }
      >
        {critiques.length === 0 ? (
          <EmptyZone label="Aucune alerte critique." />
        ) : (
          critiques.map((a) => <AlerteCard key={a.id} alerte={a} />)
        )}
      </Section>

      {/* Section 3 — Points d'attention */}
      <Section
        title="Points d'attention"
        subtitle="À surveiller — pas bloquant mais à corriger rapidement."
        countBadge={
          attention.length > 0
            ? { value: attention.length, color: '#BA7517' }
            : null
        }
      >
        {attention.length === 0 ? (
          <EmptyZone label="Aucun point d'attention." />
        ) : (
          attention.map((a) => <AlerteCard key={a.id} alerte={a} />)
        )}
      </Section>

      {/* Section 4 — Informations */}
      <Section
        title="Informations"
        subtitle="Bonnes pratiques et opportunités à exploiter."
        countBadge={
          info.length > 0 ? { value: info.length, color: '#378ADD' } : null
        }
      >
        {info.length === 0 ? (
          <EmptyZone label="Rien à signaler." />
        ) : (
          info.map((a) => <AlerteCard key={a.id} alerte={a} />)
        )}
      </Section>
    </div>
  )
}

// ── Sous-composants ──────────────────────────────────────────────

interface SectionProps {
  title: string
  subtitle?: string
  countBadge?: { value: number; color: string } | null
  children: React.ReactNode
}

function Section({ title, subtitle, countBadge, children }: SectionProps) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 4,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
        {countBadge && (
          <span
            style={{
              background: `${countBadge.color}15`,
              color: countBadge.color,
              padding: '2px 10px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {countBadge.value}
          </span>
        )}
      </div>
      {subtitle && (
        <p
          style={{
            color: '#94a3b8',
            margin: '0 0 12px',
            fontSize: 12,
          }}
        >
          {subtitle}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  )
}

function SeuilCard({ seuil }: { seuil: SeuilContractuel }) {
  const col = seuil.ok ? '#1D9E75' : '#E24B4A'
  const bg = seuil.ok ? '#ecfdf5' : '#fef2f2'
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${col}40`,
        borderRadius: 10,
        padding: 18,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: 4,
          background: col,
        }}
      />
      <div style={{ paddingLeft: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '.04em',
            marginBottom: 6,
          }}
        >
          {seuil.label}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: col,
            lineHeight: 1,
            marginBottom: 4,
          }}
        >
          {seuil.value}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
          {seuil.hint}
        </div>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
        >
          <span
            style={{
              background: `${col}20`,
              color: col,
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {seuil.ok ? '✓ OK' : '✗ KO'} — seuil {seuil.seuilLabel}
          </span>
          {seuil.note && (
            <span style={{ fontSize: 10, color: '#BA7517' }}>{seuil.note}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function AlerteCard({ alerte }: { alerte: AlerteMetier }) {
  const navigate = useNavigate()
  const styles = LEVEL_STYLES[alerte.level]
  return (
    <div
      style={{
        background: styles.bg,
        borderLeft: `4px solid ${styles.border}`,
        borderTop: '1px solid #e5e7eb',
        borderRight: '1px solid #e5e7eb',
        borderBottom: '1px solid #e5e7eb',
        borderRadius: '0 8px 8px 0',
        padding: '14px 16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          {alerte.valeur && (
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: styles.badge,
                lineHeight: 1,
                minWidth: 40,
              }}
            >
              {alerte.valeur}
            </span>
          )}
          <h3
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: '#0f172a',
              flex: 1,
            }}
          >
            {alerte.titre}
          </h3>
        </div>
        <span
          style={{
            background: `${styles.badge}20`,
            color: styles.badge,
            padding: '2px 10px',
            borderRadius: 12,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '.04em',
            whiteSpace: 'nowrap',
          }}
        >
          {styles.label}
        </span>
      </div>
      <div
        style={{
          fontSize: 12,
          color: '#475569',
          lineHeight: 1.5,
          marginBottom: alerte.action || alerte.lien ? 8 : 0,
        }}
      >
        {alerte.detail}
      </div>
      {(alerte.action || alerte.lien) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          {alerte.action && (
            <span
              style={{
                fontSize: 11,
                color: '#475569',
                background: 'rgba(255,255,255,0.6)',
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid #e5e7eb',
              }}
            >
              → {alerte.action}
            </span>
          )}
          {alerte.lien && (
            <button
              type="button"
              onClick={() => {
                if (alerte.lien) navigate(alerte.lien.path)
              }}
              style={{
                background: '#fff',
                border: `1px solid ${styles.border}`,
                color: styles.border,
                borderRadius: 5,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {alerte.lien.label} →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyZone({ label }: { label: string }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '14px 16px',
        color: '#94a3b8',
        fontSize: 13,
        fontStyle: 'italic',
      }}
    >
      {label}
    </div>
  )
}

export default Alertes
