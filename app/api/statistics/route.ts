import { NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { statisticsRepository } from '@/lib/repositories'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const [stats, topBooks, topBorrowers] = await Promise.all([
      statisticsRepository.getStatistics(),
      statisticsRepository.getTopBorrowedBooks(5),
      statisticsRepository.getTopBorrowers(5)
    ])

    return NextResponse.json({
      success: true,
      data: {
        stats,
        topBooks,
        topBorrowers
      }
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching statistics' },
      { status: 500 }
    )
  }
}
