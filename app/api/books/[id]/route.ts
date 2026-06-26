import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/role-check'
import { bookRepository } from '@/lib/repositories'

interface Params {
  id: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const auth = await requireSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const bookId = parseInt(id)

    if (isNaN(bookId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid book ID' },
        { status: 400 }
      )
    }

    const book = await bookRepository.getBookById(bookId)

    if (!book) {
      return NextResponse.json(
        { success: false, error: 'Book not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: book
    })
  } catch (error) {
    console.error('Error fetching book:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching book' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const auth = await requireSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { id } = await params
    const bookId = parseInt(id, 10)

    if (isNaN(bookId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid book ID' },
        { status: 400 }
      )
    }

    const { tit1, year, code, is_active } = await request.json()

    if (code !== undefined && String(code).trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Código de libro requerido' },
        { status: 400 }
      )
    }

    if (tit1 !== undefined || year !== undefined || code !== undefined) {
      await bookRepository.updateBook(bookId, {
        tit1: tit1 !== undefined ? String(tit1) : undefined,
        year: year !== undefined ? String(year) : undefined,
        code: code !== undefined ? String(code) : undefined
      })
    }

    if (is_active !== undefined) {
      await bookRepository.setBookActive(bookId, Boolean(is_active))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating book:', error)
    return NextResponse.json(
      { success: false, error: 'Error actualizando libro' },
      { status: 500 }
    )
  }
}
