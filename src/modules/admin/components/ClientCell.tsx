interface ClientCellProps {
  name: string
}

function initial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

/**
 * Cellule client avec avatar circle (initiale du nom) + nom en gras.
 * Fidèle au natif TessAdmin (renderInstances/renderContrats/renderSaisie).
 */
export function ClientCell({ name }: ClientCellProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: '#e2e8f0',
          color: '#475569',
          fontSize: 11,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {initial(name)}
      </div>
      <span style={{ fontWeight: 600, color: '#0f172a' }}>{name}</span>
    </div>
  )
}
