import { NextResponse } from 'next/server'
import { bookRepository } from '@/lib/repositories'
import { getCurrentSession } from '@/lib/auth'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const [sections, codeStats, statuts] = await Promise.all([
      bookRepository.getSections(),
      bookRepository.getCodeStats(),
      bookRepository.getStatuts()
    ])

    return NextResponse.json({
      success: true,
      data: {
        sections,
        codeStats,
        statuts
      }
    })
  } catch (error) {
    console.error('Error fetching copy metadata:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cargar metadatos de ejemplares' },
      { status: 500 }
    )
  }
}
