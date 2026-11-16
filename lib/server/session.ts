import { auth } from '@/lib/auth/server'

export interface SessionUser {
  id: string
  email: string
}

export async function getUser(): Promise<SessionUser | null> {
  try {
    const { data } = await auth.getSession()
    if (!data?.user) return null
    return { id: data.user.id, email: data.user.email }
  } catch {
    return null
  }
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status })
}

export const unauthorized = () => json({ success: false, error: 'Please log in first.' }, 401)
