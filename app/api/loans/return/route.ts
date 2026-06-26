import { NextRequest, NextResponse } from 'next/server'
import { loanRepository } from '@/lib/repositories'
import { getCurrentSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Body inválido' }, { status: 400 })
  }

  const expl_cb = (body.expl_cb as string | undefined)?.trim()

  if (!expl_cb) {
    return NextResponse.json(
      { success: false, error: 'Código de barras de ejemplar requerido' },
      { status: 400 }
    )
  }

  try {
    const result = await loanRepository.returnLoanByBarcode(expl_cb)
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al devolver'
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }
}
