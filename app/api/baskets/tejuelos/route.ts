import { NextRequest, NextResponse } from 'next/server'
import { basketRepository } from '@/lib/repositories'
import { getCurrentSession } from '@/lib/auth'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const items = await basketRepository.getBasketItems('Tejuelos')
    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error('Error getting Tejuelos basket items:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener la cesta' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const { expl_id } = await request.json()
    if (!expl_id) {
      return NextResponse.json({ success: false, error: 'expl_id es requerido' }, { status: 400 })
    }

    await basketRepository.addToBasket('Tejuelos', Number(expl_id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding to Tejuelos basket:', error)
    return NextResponse.json({ success: false, error: 'Error al añadir a la cesta' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const explIdStr = searchParams.get('expl_id')

    if (explIdStr) {
      await basketRepository.removeFromBasket('Tejuelos', Number(explIdStr))
    } else {
      await basketRepository.clearBasket('Tejuelos')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from/clearing Tejuelos basket:', error)
    return NextResponse.json({ success: false, error: 'Error al limpiar la cesta' }, { status: 500 })
  }
}
