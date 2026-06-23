import { NextRequest, NextResponse } from 'next/server'
import { loanRepository } from '@/lib/repositories'
import { configRepository } from '@/lib/repositories'
import { getCurrentSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'
    const userId = searchParams.get('userId')
    const borrower = searchParams.get('borrower') || undefined
    const book = searchParams.get('book') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const sortBy = (searchParams.get('sortBy') || 'pret_date') as
      | 'pret_id'
      | 'pret_date'
      | 'pret_retour'
      | 'tit1'
      | 'empr_nom'
    const sortDir = (searchParams.get('sortDir') || 'desc') as 'asc' | 'desc'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10))
    )

    const uid = userId ? parseInt(userId, 10) : undefined

    const result = await loanRepository.getLoansPaginated(page, pageSize, {
      userId: !uid || isNaN(uid) ? undefined : uid,
      activeOnly,
      borrower,
      book,
      dateFrom,
      dateTo,
      sortBy,
      sortDir
    })

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
    console.error('Error fetching loans:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching loans' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body invalido' }, { status: 400 })
  }

  const expl_cb = (body.expl_cb as string | undefined)?.trim()
  const id_empr = body.id_empr

  if (!expl_cb) {
    return NextResponse.json(
      { success: false, error: 'Codigo de barras requerido' },
      { status: 400 }
    )
  }
  if (!id_empr || isNaN(Number(id_empr)) || Number(id_empr) <= 0) {
    return NextResponse.json(
      { success: false, error: 'ID de usuario invalido' },
      { status: 400 }
    )
  }

  try {
    const settings = await configRepository.getSettings()
    const maxLoanDays = parseInt(
      settings.find(s => s.key_name === 'max_loan_days')?.key_value || '14',
      10
    )
    const result = await loanRepository.createLoan(expl_cb, Number(id_empr), maxLoanDays)
    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear prestamo'
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}
