import { NextRequest, NextResponse } from 'next/server'
import { bookRepository, basketRepository } from '@/lib/repositories'
import { getCurrentSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const { book, copy } = await request.json()

    if (!book || !book.tit1 || !book.tit1.trim()) {
      return NextResponse.json(
        { success: false, error: 'El título del libro es obligatorio' },
        { status: 400 }
      )
    }

    if (!copy || !copy.expl_cb || !copy.expl_cb.trim()) {
      return NextResponse.json(
        { success: false, error: 'El código de barras del colegio es obligatorio' },
        { status: 400 }
      )
    }

    if (!copy.expl_section || isNaN(Number(copy.expl_section))) {
      return NextResponse.json(
        { success: false, error: 'La sección del ejemplar es obligatoria' },
        { status: 400 }
      )
    }

    if (!copy.expl_codestat || isNaN(Number(copy.expl_codestat))) {
      return NextResponse.json(
        { success: false, error: 'El código estadístico es obligatorio' },
        { status: 400 }
      )
    }

    // Call advanced creation in repository
    const result = await bookRepository.createBookAdvanced(
      {
        tit1: String(book.tit1).trim(),
        author_id: book.author_id ? Number(book.author_id) : undefined,
        ed1_id: book.ed1_id ? Number(book.ed1_id) : undefined,
        year: book.year ? String(book.year).trim() : undefined,
        npages: book.npages ? String(book.npages).trim() : undefined,
        code_langue: book.code_langue ? String(book.code_langue).trim() : undefined,
        code: book.code ? String(book.code).trim() : undefined
      },
      {
        expl_cb: String(copy.expl_cb).trim(),
        expl_cote: copy.expl_cote ? String(copy.expl_cote).trim() : '',
        expl_section: Number(copy.expl_section),
        expl_codestat: Number(copy.expl_codestat)
      }
    )

    // Automatically add this new copy to the "Tejuelos" caddie/basket
    try {
      await basketRepository.addToBasket('Tejuelos', result.explId)
    } catch (basketErr) {
      console.error('Error adding to Tejuelos caddie:', basketErr)
      // We don't fail the whole request if caddie addition fails
    }

    return NextResponse.json({
      success: true,
      data: {
        notice_id: result.noticeId,
        expl_id: result.explId,
        expl_cb: copy.expl_cb
      }
    })
  } catch (error) {
    console.error('Error in advanced book creation:', error)
    const msg = error instanceof Error ? error.message : 'Error al registrar libro'
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    )
  }
}
