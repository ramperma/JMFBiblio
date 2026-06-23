import { NextRequest, NextResponse } from 'next/server'
import { importFromFile } from '@/lib/backup'
import { validateConfirmToken, consumeConfirmToken } from '@/lib/backupTokens'
import { requireAdmin } from '@/lib/auth/role-check'
import { tmpdir } from 'os'
import { writeFile, unlink } from 'fs/promises'
import { randomBytes } from 'crypto'
import path from 'path'
import { hashPassword } from '@/lib/auth'
import { configRepository } from '@/lib/repositories'

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const token = formData.get('token') as string | null
    const confirmPhrase = (formData.get('confirm') as string || '').toString().trim().toUpperCase()
    const password = (formData.get('password') as string || '')

    if (!file) {
      return NextResponse.json({ success: false, error: 'Falta archivo' }, { status: 400 })
    }
    if (!token) {
      return NextResponse.json({ success: false, error: 'Falta token' }, { status: 400 })
    }
    if (confirmPhrase !== 'IMPORTAR') {
      return NextResponse.json(
        { success: false, error: 'Debes escribir IMPORTAR para confirmar' },
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
    if (validation.action !== 'import') {
      return NextResponse.json(
        { success: false, error: 'Token no corresponde a esta accion' },
        { status: 400 }
      )
    }

    const user = await configRepository.getLoginUser(auth.session.username)
    if (!user || user.password_hash !== hashPassword(password)) {
      return NextResponse.json(
        { success: false, error: 'Password incorrecto' },
        { status: 403 }
      )
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: `Archivo excede ${MAX_UPLOAD_BYTES / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    consumeConfirmToken(token)

    const tmpFile = path.join(tmpdir(), `upload-${randomBytes(6).toString('hex')}.sav`)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(tmpFile, buffer)

    try {
      const result = await importFromFile(tmpFile)
      return NextResponse.json({ success: true, data: result })
    } finally {
      await unlink(tmpFile).catch(() => undefined)
    }
  } catch (error) {
    console.error('Error importing:', error)
    return NextResponse.json(
      { success: false, error: 'Error al importar: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
