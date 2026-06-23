import crypto from 'crypto'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'jmf_biblio_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 8
const SESSION_SECRET = process.env.SESSION_SECRET || 'jmf_biblio_local_secret'

type SessionData = {
  userId: number
  username: string
  role: 'admin' | 'staff'
  expiresAt: number
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

function signPayload(payload: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex')
}

function encodeSession(session: SessionData): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const signature = signPayload(payload)
  return `${payload}.${signature}`
}

function decodeSession(token: string): SessionData | null {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) {
    return null
  }

  const expectedSignature = signPayload(payload)
  if (signature !== expectedSignature) {
    return null
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionData
    return data
  } catch {
    return null
  }
}

export function createSession(userId: number, username: string, role: 'admin' | 'staff'): string {
  const session: SessionData = {
    userId,
    username,
    role,
    expiresAt: Date.now() + SESSION_TTL_MS
  }

  return encodeSession(session)
}

export async function getCurrentSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (!token) {
    return null
  }

  const session = decodeSession(token)
  if (!session) {
    return null
  }

  if (session.expiresAt < Date.now()) {
    return null
  }

  return {
    token,
    ...session
  }
}

export function deleteSession(token: string) {
  return token
}

export function getSessionCookieName() {
  return SESSION_COOKIE
}
