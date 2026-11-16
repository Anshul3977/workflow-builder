'use client'

import { createContext, useCallback, useContext } from 'react'
import { authClient } from '@/lib/auth/client'

interface AuthUser {
  id: string
  email: string
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { message?: string; error?: { message?: string } }
    return e.error?.message || e.message || 'Something went wrong'
  }
  return 'Something went wrong'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending, refetch } = authClient.useSession()
  const user = data?.user ? { id: data.user.id, email: data.user.email } : null

  const signUp = useCallback(
    async (email: string, password: string) => {
      try {
        const { error } = await authClient.signUp.email({ email, password, name: email.split('@')[0] })
        if (error) return { error: errorMessage(error) }
        await refetch()
        return { error: null }
      } catch (err) {
        return { error: errorMessage(err) }
      }
    },
    [refetch],
  )

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const { error } = await authClient.signIn.email({ email, password })
        if (error) return { error: errorMessage(error) }
        await refetch()
        return { error: null }
      } catch (err) {
        return { error: errorMessage(err) }
      }
    },
    [refetch],
  )

  const signOut = useCallback(async () => {
    await authClient.signOut()
    await refetch()
  }, [refetch])

  return (
    <AuthContext.Provider value={{ user, isLoading: isPending, signUp, signIn, signOut }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
