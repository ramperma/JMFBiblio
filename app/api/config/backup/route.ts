import { NextRequest, NextResponse } from 'next/server'
import { createBackup, listBackups, deleteBackup } from '@/lib/backup'
import { requireAdmin } from '@/lib/auth/role-check'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  try {
    const backups = await listBackups()
    return NextResponse.json({ success: true, data: backups, count: backups.length })
  } catch (error) {
    console.error('Error listing backups:', error)
    return NextResponse.json(
      { success: false, error: 'Error al listar backups' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const label = body.label as string | undefined
    const info = await createBackup(label)
    return NextResponse.json({ success: true, data: info })
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear backup: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Falta parametro name' },
        { status: 400 }
      )
    }
    await deleteBackup(name)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting backup:', error)
    return NextResponse.json(
      { success: false, error: 'Error al borrar: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
