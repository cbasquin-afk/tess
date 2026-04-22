import { Link } from 'react-router-dom'
import type { Commercial } from '../types'

interface CommercialSelectorProps {
  commerciaux: Commercial[]
  activeId: string | 'equipe'
  hideEquipe?: boolean
}

export function CommercialSelector({
  commerciaux,
  activeId,
  hideEquipe,
}: CommercialSelectorProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 4,
        background: '#f1f5f9',
        padding: 4,
        borderRadius: 8,
      }}
    >
      {!hideEquipe && (
        <TabLink to="/tessperf" active={activeId === 'equipe'} label="Équipe" />
      )}
      {commerciaux.map((c) => (
        <TabLink
          key={c.id}
          to={`/tessperf/commercial/${c.id}`}
          active={activeId === c.id}
          label={c.prenom}
        />
      ))}
    </div>
  )
}

function TabLink({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link
      to={to}
      style={{
        padding: '6px 14px',
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        background: active ? '#1f3a8a' : 'transparent',
        color: active ? '#fff' : '#475569',
        textDecoration: 'none',
        transition: 'background .15s',
      }}
    >
      {label}
    </Link>
  )
}
