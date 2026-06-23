import crypto from 'crypto'

const SECRET = process.env.SESSION_SECRET || 'jmf_biblio_local_secret'
const TTL_MS = 5 * 60 * 1000

type TokenData = {
  userId: number
  username: string
  action: 'reset' | 'import'
  issuedAt: number
  expiresAt: number
}

const used = new Set<string>()

function signPayload(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
}

function encodeToken(data: TokenData): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  return `${payload}.${signPayload(payload)}`
}

function decodeToken(token: string): TokenData | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  if (signPayload(payload) !== sig) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenData
  } catch {
    return null
  }
}

export function issueConfirmToken(action: 'reset' | 'import', userId = 1, username = 'admin'): string {
  const now = Date.now()
  const data: TokenData = {
    userId,
    username,
    action,
    issuedAt: now,
    expiresAt: now + TTL_MS
  }
  return encodeToken(data)
}

export function validateConfirmToken(token: string): { valid: boolean; action?: string; error?: string } {
  const data = decodeToken(token)
  if (!data) {
    return { valid: false, error: 'Token invalido' }
  }
  if (data.expiresAt < Date.now()) {
    return { valid: false, error: 'Token expirado' }
  }
  if (used.has(token)) {
    return { valid: false, error: 'Token ya usado' }
  }
  return { valid: true, action: data.action }
}

export function consumeConfirmToken(token: string): void {
  used.add(token)
  if (used.size > 1000) {
    const arr = [...used]
    used.clear()
    arr.slice(-500).forEach(t => used.add(t))
  }
}
