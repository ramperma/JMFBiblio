import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { groupRepository } from '@/lib/repositories'

export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const { fromGroupId, toGroupId } = await request.json()
    
    if (!fromGroupId || isNaN(Number(fromGroupId))) {
      return NextResponse.json({ success: false, error: 'Grupo de origen inválido' }, { status: 400 })
    }
    if (!toGroupId || isNaN(Number(toGroupId))) {
      return NextResponse.json({ success: false, error: 'Grupo de destino inválido' }, { status: 400 })
    }

    const fromId = Number(fromGroupId)
    const toId = Number(toGroupId)

    if (fromId === toId) {
      return NextResponse.json({ success: false, error: 'El grupo de origen y destino deben ser diferentes' }, { status: 400 })
    }

    await groupRepository.transferGroupMembers(fromId, toId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error promoting group members:', error)
    return NextResponse.json({ success: false, error: 'Error al promocionar los alumnos del grupo' }, { status: 500 })
  }
}
