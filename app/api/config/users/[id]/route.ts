import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { configRepository } from '@/lib/repositories'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const { id: paramId } = await params
    const id = parseInt(paramId, 10)
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID invalido' }, { status: 400 })
    }

    const { username, password, role } = await request.json()
    await configRepository.updateUser(id, {
      username: username ? String(username) : undefined,
      password: password ? String(password) : undefined,
      role: role === 'admin' || role === 'staff' ? role : undefined
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating config user:', error)
    return NextResponse.json({ success: false, error: 'Error updating config user' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const { id: paramId } = await params
    const id = parseInt(paramId, 10)
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'ID invalido' }, { status: 400 })
    }

    await configRepository.deleteUser(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting config user:', error)
    return NextResponse.json({ success: false, error: 'Error deleting config user' }, { status: 500 })
  }
}
