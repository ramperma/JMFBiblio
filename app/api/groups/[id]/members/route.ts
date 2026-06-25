import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { groupRepository } from '@/lib/repositories'

interface Params {
  id: string
}

export async function POST(
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

    const { userId } = await request.json()
    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json({ success: false, error: 'ID de usuario invalido' }, { status: 400 })
    }

    await groupRepository.addUserToGroup(Number(userId), groupId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding user to group:', error)
    return NextResponse.json(
      { success: false, error: 'Error agregando usuario al grupo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId || isNaN(Number(userId))) {
      return NextResponse.json({ success: false, error: 'ID de usuario invalido' }, { status: 400 })
    }

    await groupRepository.removeUserFromGroup(Number(userId), groupId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing user from group:', error)
    return NextResponse.json(
      { success: false, error: 'Error removiendo usuario del grupo' },
      { status: 500 }
    )
  }
}
