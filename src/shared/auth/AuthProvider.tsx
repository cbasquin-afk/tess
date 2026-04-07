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
  role: UserRole | null
  nom: string | null
  prenom: string | null
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false

    async function hydrateUser(currentSession: Session | null): Promise<void> {
      if (!currentSession) {
        if (!cancelled) setUser(null)
        return
      }
      const authUser = currentSession.user
      const { data, error } = await supabase
        .from('perflead_users')
        .select('role, nom, prenom')
        .eq('id', authUser.id)
        .maybeSingle<PerfleadUserRow>()

      if (cancelled) return

      if (error) {
        // eslint-disable-next-line no-console
        console.error('[tess] Échec récupération profil perflead_users', error)
        setUser(null)
        return
      }

      setUser({
        id: authUser.id,
        email: authUser.email ?? '',
        nom: data?.nom ?? null,
        prenom: data?.prenom ?? null,
        role: (data?.role ?? 'commercial') as UserRole,
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
