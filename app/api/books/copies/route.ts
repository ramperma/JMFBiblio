import { NextRequest, NextResponse } from 'next/server'
import { bookRepository } from '@/lib/repositories'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const nextParam = searchParams.get('next')
    
    if (nextParam === '1' || nextParam === 'true') {
      const nextBarcode = await bookRepository.getNextBarcode()
      return NextResponse.json({ success: true, data: { nextBarcode } })
    }

    const q = searchParams.get('q') || undefined
    const copies = await bookRepository.getAvailableCopies(q)
    return NextResponse.json({ success: true, data: copies })
  } catch (error) {
    console.error('Error fetching available copies/next barcode:', error)
    return NextResponse.json(
      { success: false, error: 'Error buscando ejemplares' },
      { status: 500 }
    )
  }
}
