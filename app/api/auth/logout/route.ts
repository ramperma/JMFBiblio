import { NextResponse } from 'next/server'
import { deleteSession, getCurrentSession, getSessionCookieName } from '@/lib/auth'

export async function POST() {
  const session = await getCurrentSession()

  if (session) {
    deleteSession(session.token)
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(getSessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  })

  return response
}
