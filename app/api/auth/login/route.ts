import { NextRequest, NextResponse } from 'next/server'
import { createSession, getSessionCookieName, hashPassword } from '@/lib/auth'
import { authRepository, configRepository, RATE_LIMIT_CONFIG, getClientIp } from '@/lib/repositories'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  try {
    const failures = await authRepository.getRecentFailures(
      ip,
      RATE_LIMIT_CONFIG.windowMinutes
    )

    if (failures >= RATE_LIMIT_CONFIG.maxFailures) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiados intentos. Espera ${RATE_LIMIT_CONFIG.windowMinutes} minutos.`
        },
        { status: 429 }
      )
    }

    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Usuario y contrasena son obligatorios' },
        { status: 400 }
      )
    }

    const user = await configRepository.getLoginUser(String(username))
    if (!user || user.password_hash !== hashPassword(String(password))) {
      await authRepository.recordAttempt(ip, false)
      return NextResponse.json(
        { success: false, error: 'Credenciales invalidas' },
        { status: 401 }
      )
    }

    await authRepository.clearAttempts(ip)

    const token = createSession(user.id, user.username, user.role)

    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    })

    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8
    })

    return response
  } catch (error) {
    console.error('Error login:', error)
    await authRepository.recordAttempt(ip, false).catch(() => undefined)
    return NextResponse.json({ success: false, error: 'Error en login' }, { status: 500 })
  }
}
