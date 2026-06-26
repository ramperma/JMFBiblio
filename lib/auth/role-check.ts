import { getCurrentSession } from '@/lib/auth'

export interface AdminSession {
  userId: number
  username: string
  role: 'admin' | 'staff'
  expiresAt: number
  token: string
}

export type AdminCheckResult =
  | { ok: true; session: AdminSession }
  | { ok: false; status: number; error: string }

export async function requireSession(): Promise<AdminCheckResult> {
  const session = await getCurrentSession()
  if (!session) {
    return { ok: false, status: 401, error: 'No autenticado' }
  }
  return { ok: true, session }
}

export async function requireAdmin(): Promise<AdminCheckResult> {
  const session = await getCurrentSession()
  if (!session) {
    return { ok: false, status: 401, error: 'No autenticado' }
  }
  if (session.role !== 'admin') {
    return { ok: false, status: 403, error: 'Requiere rol admin' }
  }
  return { ok: true, session }
}
