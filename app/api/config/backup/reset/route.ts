import { NextRequest, NextResponse } from 'next/server'
import { validateConfirmToken, consumeConfirmToken } from '@/lib/backupTokens'
import { resetDatabase, dropPmbTables } from '@/lib/backup'
import { requireAdmin } from '@/lib/auth/role-check'
import { configRepository } from '@/lib/repositories'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const token = body.token as string | undefined
    const confirmPhrase = (body.confirm || '').toString().trim().toUpperCase()
    const password = body.password as string | undefined

    if (!token) {
      return NextResponse.json({ success: false, error: 'Falta token' }, { status: 400 })
    }
    if (confirmPhrase !== 'BORRAR') {
      return NextResponse.json(
        { success: false, error: 'Debes escribir BORRAR para confirmar' },
        { status: 400 }
      )
    }
    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Debes confirmar con tu password' },
        { status: 400 }
      )
    }
    const validation = validateConfirmToken(token)
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 })
    }
    if (validation.action !== 'reset') {
      return NextResponse.json(
        { success: false, error: 'Token no corresponde a esta accion' },
        { status: 400 }
      )
    }
    consumeConfirmToken(token)

    const user = await configRepository.getLoginUser(auth.session.username)
    if (!user || user.password_hash !== hashPassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Password incorrecto' },
        { status: 403 }
      )
    }

    await resetDatabase()
    const dropped = await dropPmbTables()
    await configRepository.ensureTables()

    return NextResponse.json({
      success: true,
      data: { tablesDropped: dropped, message: 'BD reiniciada' }
    })
  } catch (error) {
    console.error('Error resetting database:', error)
    return NextResponse.json(
      { success: false, error: 'Error al reiniciar: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
