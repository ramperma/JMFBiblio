import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { groupRepository } from '@/lib/repositories'

interface Params {
  id: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const { id } = await params
    const groupId = parseInt(id, 10)
    if (isNaN(groupId)) {
      return NextResponse.json({ success: false, error: 'ID de grupo invalido' }, { status: 400 })
    }

    const { libelle } = await request.json()
    if (!libelle || !libelle.trim()) {
      return NextResponse.json({ success: false, error: 'Nombre de grupo requerido' }, { status: 400 })
    }

    await groupRepository.updateGroup(groupId, libelle.trim())
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating group:', error)
    return NextResponse.json(
      { success: false, error: 'Error actualizando grupo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const { id } = await params
    const groupId = parseInt(id, 10)
    if (isNaN(groupId)) {
      return NextResponse.json({ success: false, error: 'ID de grupo invalido' }, { status: 400 })
    }

    await groupRepository.deleteGroup(groupId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting group:', error)
    return NextResponse.json(
      { success: false, error: 'Error eliminando grupo' },
      { status: 500 }
    )
  }
}
