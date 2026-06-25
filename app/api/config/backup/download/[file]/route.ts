import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/role-check'
import { getBackupPath } from '@/lib/backup'
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  try {
    const { file } = await params
    const filepath = getBackupPath(file)
    if (!existsSync(filepath)) {
      return NextResponse.json({ success: false, error: 'Archivo no encontrado' }, { status: 404 })
    }
    const buffer = await readFile(filepath)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Length': String(buffer.byteLength),
        'Content-Disposition': `attachment; filename="${file}"`
      }
    })
  } catch (error) {
    console.error('Error downloading backup:', error)
    return NextResponse.json(
      { success: false, error: 'Error al descargar' },
      { status: 500 }
    )
  }
}
