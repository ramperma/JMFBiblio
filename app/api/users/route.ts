import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { userRepository } from '@/lib/repositories'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || undefined
    const sortBy = (searchParams.get('sortBy') || 'empr_nom') as
      | 'id_empr'
      | 'empr_nom'
      | 'empr_prenom'
      | 'empr_cb'
      | 'empr_mail'
      | 'empr_tel1'
    const sortDir = (searchParams.get('sortDir') || 'asc') as 'asc' | 'desc'
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10))
    )

    const result = await userRepository.getUsersPaginated(
      page,
      pageSize,
      query,
      sortBy,
      sortDir,
      includeInactive
    )

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data.length,
      pagination: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / pageSize))
      }
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const { empr_nom, empr_prenom, empr_cb, empr_mail, empr_tel1 } = await request.json()

    if (!empr_nom || !empr_prenom) {
      return NextResponse.json(
        { success: false, error: 'Nombre y apellido son obligatorios' },
        { status: 400 }
      )
    }

    const id = await userRepository.createUser({
      empr_nom: String(empr_nom).trim(),
      empr_prenom: String(empr_prenom).trim(),
      empr_cb: empr_cb ? String(empr_cb).trim() : undefined,
      empr_mail: empr_mail ? String(empr_mail).trim() : undefined,
      empr_tel1: empr_tel1 ? String(empr_tel1).trim() : undefined
    })

    return NextResponse.json({ success: true, data: { id_empr: id } })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: 'Error creando usuario' },
      { status: 500 }
    )
  }
}
