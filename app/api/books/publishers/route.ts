import { NextRequest, NextResponse } from 'next/server'
import { bookRepository } from '@/lib/repositories'
import { getCurrentSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  try {
    const publishers = await bookRepository.searchPublishers(q)
    return NextResponse.json({ success: true, data: publishers })
  } catch (error) {
    console.error('Error searching publishers:', error)
    return NextResponse.json({ success: false, error: 'Error al buscar editoriales' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const { name } = await request.json()
    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Nombre de editorial requerido' }, { status: 400 })
    }

    const id = await bookRepository.createPublisher(name.trim())
    return NextResponse.json({ success: true, data: { ed_id: id } })
  } catch (error) {
    console.error('Error creating publisher:', error)
    return NextResponse.json({ success: false, error: 'Error al crear editorial' }, { status: 500 })
  }
}
