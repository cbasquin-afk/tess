import { Link } from 'react-router-dom'

export function Forbidden() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 16,
        fontFamily: 'system-ui, sans-serif',
        background: '#f8fafc',
      }}
    >
      <div style={{ fontSize: 64 }}>🛑</div>
      <h1 style={{ margin: 0, fontSize: 24 }}>Accès refusé</h1>
      <p style={{ color: '#64748b', maxWidth: 360, textAlign: 'center' }}>
        Tu n’as pas les droits nécessaires pour accéder à ce module. Contacte un
        administrateur si tu penses qu’il s’agit d’une erreur.
      </p>
      <Link
        to="/"
        style={{
          color: '#1f3a8a',
          textDecoration: 'none',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        ← Retour à l’accueil
      </Link>
    </div>
  )
}

export default Forbidden
