import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../shared/supabase'
import { useAuth } from '../shared/auth/useAuth'
import { popAuthError } from '../shared/auth/AuthProvider'
import { Button } from '../shared/ui'

export function Login() {
  const { session, role, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Récupère une éventuelle erreur d'auth poussée par l'AuthProvider lors
  // d'une déconnexion forcée (profil manquant, compte désactivé, rôle
  // invalide, etc.). Affichée au-dessus du formulaire au premier render.
  useEffect(() => {
    const err = popAuthError()
    if (err) setError(err)
  }, [])

  if (loading) {
    return <div style={{ padding: 32 }}>Chargement…</div>
  }
  if (session) {
    // Fournisseur externe : redirection vers son espace PerfLead restreint.
    const landing = role === 'fournisseur' ? '/perflead' : '/'
    return <Navigate to={landing} replace />
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setSubmitting(false)
    if (err) {
      setError(err.message)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0f172a',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          background: '#fff',
          padding: 32,
          borderRadius: 10,
          width: 360,
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Tess<span style={{ color: '#1f3a8a' }}>.</span>
        </div>
        <div style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
          Plateforme interne Tessoria
        </div>

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: 14,
            marginBottom: 14,
            boxSizing: 'border-box',
          }}
        />

        <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
          Mot de passe
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            fontSize: 14,
            marginBottom: 18,
            boxSizing: 'border-box',
          }}
        />

        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '8px 10px',
              borderRadius: 6,
              fontSize: 12,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={submitting}
          style={{ width: '100%' }}
        >
          {submitting ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>
    </div>
  )
}

export default Login
