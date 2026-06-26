import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/role-check'
import { groupRepository } from '@/lib/repositories'

export async function GET(_request: NextRequest) {
  const auth = await requireSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const data = await groupRepository.getAllGroups()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching groups' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { libelle } = await request.json()
    if (!libelle || !libelle.trim()) {
      return NextResponse.json({ success: false, error: 'Nombre de grupo requerido' }, { status: 400 })
    }

    const id = await groupRepository.createGroup(libelle.trim())
    return NextResponse.json({ success: true, data: { id_groupe: id } })
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json(
      { success: false, error: 'Error creando grupo' },
      { status: 500 }
    )
  }
}
