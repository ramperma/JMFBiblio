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
    const authors = await bookRepository.searchAuthors(q)
    return NextResponse.json({ success: true, data: authors })
  } catch (error) {
    console.error('Error searching authors:', error)
    return NextResponse.json({ success: false, error: 'Error al buscar autores' }, { status: 500 })
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
      return NextResponse.json({ success: false, error: 'Nombre de autor requerido' }, { status: 400 })
    }

    const id = await bookRepository.createAuthor(name.trim())
    return NextResponse.json({ success: true, data: { author_id: id } })
  } catch (error) {
    console.error('Error creating author:', error)
    return NextResponse.json({ success: false, error: 'Error al crear autor' }, { status: 500 })
  }
}
