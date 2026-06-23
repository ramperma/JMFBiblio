import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { configRepository } from '@/lib/repositories'

function parsePagination(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)))
  return { page, pageSize }
}

export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const { page, pageSize } = parsePagination(request)
    const result = await configRepository.getUsersPaginated(page, pageSize)

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        page,
        pageSize,
        total: result.total,
        totalPages: Math.max(1, Math.ceil(result.total / pageSize))
      }
    })
  } catch (error) {
    console.error('Error fetching config users:', error)
    return NextResponse.json({ success: false, error: 'Error fetching config users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const { username, password, role } = await request.json()

    if (!username || !password || !role) {
      return NextResponse.json({ success: false, error: 'Datos incompletos' }, { status: 400 })
    }

    const id = await configRepository.createUser({
      username: String(username),
      password: String(password),
      role: role === 'admin' ? 'admin' : 'staff'
    })

    return NextResponse.json({ success: true, data: { id } })
  } catch (error) {
    console.error('Error creating config user:', error)
    return NextResponse.json({ success: false, error: 'Error creating config user' }, { status: 500 })
  }
}
