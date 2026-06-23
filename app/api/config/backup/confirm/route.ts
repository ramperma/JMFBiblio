import { NextRequest, NextResponse } from 'next/server'
import { issueConfirmToken } from '@/lib/backupTokens'
import { requireAdmin } from '@/lib/auth/role-check'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    if (action !== 'reset' && action !== 'import') {
      return NextResponse.json(
        { success: false, error: 'action debe ser reset o import' },
        { status: 400 }
      )
    }
    const token = issueConfirmToken(action)
    return NextResponse.json({ success: true, data: { token, action, ttlSeconds: 300 } })
  } catch (error) {
    console.error('Error issuing confirm token:', error)
    return NextResponse.json(
      { success: false, error: 'Error al emitir token' },
      { status: 500 }
    )
  }
}
