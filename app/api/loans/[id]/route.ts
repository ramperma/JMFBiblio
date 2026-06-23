import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { loanRepository } from '@/lib/repositories'
import { configRepository } from '@/lib/repositories'

// id = pret_idexpl (primary key of pret)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  const { id } = await params
  const explId = parseInt(id, 10)
  if (isNaN(explId) || explId <= 0) {
    return NextResponse.json({ success: false, error: 'ID invalido' }, { status: 400 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body invalido' }, { status: 400 })
  }

  const action = body.action as string | undefined

  if (action === 'return') {
    try {
      await loanRepository.returnLoan(explId)
      return NextResponse.json({ success: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al devolver'
      return NextResponse.json({ success: false, error: msg }, { status: 400 })
    }
  }

  if (action === 'renew') {
    try {
      const settings = await configRepository.getSettings()
      const maxLoanDays = parseInt(
        settings.find(s => s.key_name === 'max_loan_days')?.key_value || '14',
        10
      )
      const maxRenewals = parseInt(
        settings.find(s => s.key_name === 'max_renewals')?.key_value || '2',
        10
      )
      const result = await loanRepository.renewLoan(explId, maxLoanDays, maxRenewals)
      return NextResponse.json({ success: true, data: result })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al renovar'
      return NextResponse.json({ success: false, error: msg }, { status: 400 })
    }
  }

  return NextResponse.json({ success: false, error: 'Accion desconocida' }, { status: 400 })
}
