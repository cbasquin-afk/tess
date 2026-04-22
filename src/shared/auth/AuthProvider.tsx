import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from '../supabase'
import type { AppUser, UserRole } from '../types'

interface AuthContextValue {
  session: Session | null
  user: AppUser | null
  role: UserRole | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

interface AuthProviderProps {
  children: ReactNode
}

interface PerfleadUserRow {
  role: string | null
  nom: string | null
  prenom: string | null
  actif: boolean | null
}

// Liste d'autorité des rôles acceptés. Toute autre valeur en DB
// (ancien rôle, typo, NULL) est traitée comme invalide → déconnexion.
const VALID_ROLES: readonly UserRole[] = [
  'fournisseur',
  'commercial',
  'admin',
  'superadmin',
]

function isValidRole(r: unknown): r is UserRole {
  return typeof r === 'string' && (VALID_ROLES as readonly string[]).includes(r)
}

/**
 * Charge le profil perflead_users de l'utilisateur authentifié.
 *
 * On contourne délibérément `supabase.from(...)` ici et on utilise `fetch()`
 * avec un `Authorization: Bearer <access_token>` attaché manuellement.
 * Raison : juste après `signInWithPassword`, le client supabase-js peut mettre
 * quelques ticks à propager son token à la couche PostgREST interne, ce qui
 * produit des requêtes anonymes (apikey seul, sans Authorization). Avec une
 * RLS du type `auth.uid() = id`, ces requêtes anonymes retournent 0 ligne et
 * déclenchent à tort forceLogout.
 *
 * Ici on passe `session.access_token` en dur → l'Authorization header est
 * garanti peu importe l'état interne de supabase-js.
 */
async function fetchProfile(
  session: Session,
): Promise<{ ok: true; data: PerfleadUserRow | null } | { ok: false; error: string }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, error: 'Configuration Supabase manquante.' }
  }
  if (!session.access_token) {
    return { ok: false, error: 'access_token absent de la session.' }
  }
  try {
    const qs = new URLSearchParams({
      id: `eq.${session.user.id}`,
      select: 'role,nom,prenom,actif',
    })
    const res = await fetch(`${SUPABASE_URL}/rest/v1/perflead_users?${qs.toString()}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        Accept: 'application/json',
      },
    })
    if (!res.ok) {
      const body = await res.text()
      return {
        ok: false,
        error: `perflead_users HTTP ${res.status} — ${body.slice(0, 200)}`,
      }
    }
    const rows = (await res.json()) as PerfleadUserRow[]
    return { ok: true, data: rows[0] ?? null }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

// ── Mécanisme d'affichage d'erreur sur /login après un forceLogout ────
// On stocke l'erreur dans sessionStorage pour la récupérer une fois sur
// l'écran de connexion, puis on la purge.
const AUTH_ERROR_KEY = 'tess.auth.error'

export function popAuthError(): string | null {
  try {
    const v = sessionStorage.getItem(AUTH_ERROR_KEY)
    if (v) sessionStorage.removeItem(AUTH_ERROR_KEY)
    return v
  } catch {
    return null
  }
}

function pushAuthError(msg: string): void {
  try {
    sessionStorage.setItem(AUTH_ERROR_KEY, msg)
  } catch {
    /* noop */
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false

    async function forceLogout(reason: string): Promise<void> {
      // eslint-disable-next-line no-console
      console.error('[AuthProvider] Déconnexion forcée :', reason)
      pushAuthError(reason)
      try {
        await supabase.auth.signOut()
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[AuthProvider] signOut a échoué', e)
      }
      if (!cancelled) {
        setUser(null)
        setSession(null)
      }
      // L'AuthGuard redirige déjà vers /login quand session est null.
      // On force un redirect dur ici uniquement si on est ailleurs que
      // /login pour que le message d'erreur apparaisse immédiatement.
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        window.location.assign('/login')
      }
    }

    async function hydrateUser(currentSession: Session | null): Promise<void> {
      if (!currentSession) {
        if (!cancelled) setUser(null)
        return
      }
      const authUser = currentSession.user
      const email = authUser.email ?? ''

      if (!authUser.id || !email) {
        await forceLogout('Session Supabase invalide (uid ou email manquant).')
        return
      }

      // perflead_users.id = auth.uid() — match direct sur la PK (RLS compat).
      // Utilise fetchProfile() qui force un Authorization: Bearer explicite
      // pour éviter la course d'état de supabase-js juste après signIn.
      const result = await fetchProfile(currentSession)

      if (cancelled) return

      if (!result.ok) {
        // eslint-disable-next-line no-console
        console.error(
          '[AuthProvider] Erreur lecture perflead_users pour',
          email,
          result.error,
        )
        await forceLogout(
          'Impossible de récupérer votre profil. Contactez un administrateur.',
        )
        return
      }

      const data = result.data

      if (!data) {
        await forceLogout(
          'Profil utilisateur introuvable. Contactez un administrateur.',
        )
        return
      }

      if (data.actif === false) {
        await forceLogout(
          'Votre compte est désactivé. Contactez un administrateur.',
        )
        return
      }

      if (!isValidRole(data.role)) {
        await forceLogout(
          'Rôle utilisateur invalide. Contactez un administrateur.',
        )
        return
      }

      setUser({
        id: authUser.id,
        email,
        nom: data.nom,
        prenom: data.prenom,
        role: data.role,
      })
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setSession(data.session)
      void hydrateUser(data.session).finally(() => {
        if (!cancelled) setLoading(false)
      })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      void hydrateUser(next)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      role: user?.role ?? null,
      loading,
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }),
    [session, user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
