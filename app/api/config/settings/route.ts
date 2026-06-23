import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { configRepository } from '@/lib/repositories'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const settings = await configRepository.getSettings()
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ success: false, error: 'Error fetching settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const settings = Array.isArray(body?.settings) ? body.settings : []
    await configRepository.updateSettings(settings)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ success: false, error: 'Error updating settings' }, { status: 500 })
  }
}
