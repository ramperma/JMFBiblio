import { NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { userRepository } from '@/lib/repositories'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const categories = await userRepository.getUserCategories()
    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { success: false, error: 'Error cargando categorías de usuario' },
      { status: 500 }
    )
  }
}
