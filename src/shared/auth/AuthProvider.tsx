import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabase'
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
 * On passe par la RPC `public.get_my_profile()` (SECURITY DEFINER) qui
 * résout l'utilisateur via `auth.uid()` côté serveur. Cela contourne le
 * problème où le header `Authorization: Bearer` n'arrivait pas à être
 * attaché aux requêtes PostgREST directes (cause inconnue côté navigateur,
 * cf. commit précédent 69e2af2 qui tentait un fetch() manuel sans succès).
 */
async function fetchProfile(
  session: Session,
): Promise<
  | { ok: true; data: PerfleadUserRow | null }
  | { ok: false; error: string }
> {
  if (!session.access_token) {
    return { ok: false, error: 'access_token absent de la session.' }
  }
  try {
    const { data, error } = await supabase.rpc('get_my_profile')
    if (error) {
      return { ok: false, error: `get_my_profile RPC: ${error.message}` }
    }
    // La RPC retourne une TABLE → PostgREST renvoie un tableau de lignes.
    const profile =
      Array.isArray(data) && data.length > 0
        ? (data[0] as PerfleadUserRow)
        : null
    return { ok: true, data: profile }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
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
