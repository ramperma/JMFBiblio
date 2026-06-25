import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { bookRepository } from '@/lib/repositories'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || undefined
    const sortBy = (searchParams.get('sortBy') || 'tit1') as
      | 'notice_id'
      | 'tit1'
      | 'year'
      | 'code'
    const sortDir = (searchParams.get('sortDir') || 'asc') as 'asc' | 'desc'
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10))
    )

    const result = await bookRepository.getBooksPaginated(
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
    console.error('Error fetching books:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching books' },
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
    const { tit1, year, code } = await request.json()

    if (!tit1 || String(tit1).trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Titulo invalido' },
        { status: 400 }
      )
    }

    if (!code || String(code).trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Código de libro requerido' },
        { status: 400 }
      )
    }

    const { noticeId, explCb } = await bookRepository.createBook({
      tit1: String(tit1).trim(),
      year: year ? String(year).trim() : undefined,
      code: code ? String(code).trim() : undefined
    })

    return NextResponse.json({ success: true, data: { notice_id: noticeId, expl_cb: explCb } })
  } catch (error) {
    console.error('Error creating book:', error)
    return NextResponse.json(
      { success: false, error: 'Error creando libro' },
      { status: 500 }
    )
  }
}
