import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { userRepository } from '@/lib/repositories'
import { loanRepository } from '@/lib/repositories'

interface Params {
  id: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const userId = parseInt(params.id)

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const user = await userRepository.getUserById(userId)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user's active loans
    const activeLoans = await loanRepository.getActiveLoans(userId)

    return NextResponse.json({
      success: true,
      data: {
        user,
        activeLoans
      }
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { success: false, error: 'Error fetching user' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const userId = parseInt(params.id, 10)

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const { empr_nom, empr_prenom, empr_cb, empr_mail, empr_tel1, is_active } =
      await request.json()

    if (
      empr_nom !== undefined ||
      empr_prenom !== undefined ||
      empr_cb !== undefined ||
      empr_mail !== undefined ||
      empr_tel1 !== undefined
    ) {
      await userRepository.updateUser(userId, {
        empr_nom: empr_nom !== undefined ? String(empr_nom) : undefined,
        empr_prenom: empr_prenom !== undefined ? String(empr_prenom) : undefined,
        empr_cb: empr_cb !== undefined ? String(empr_cb) : undefined,
        empr_mail: empr_mail !== undefined ? String(empr_mail) : undefined,
        empr_tel1: empr_tel1 !== undefined ? String(empr_tel1) : undefined
      })
    }

    if (is_active !== undefined) {
      await userRepository.setUserActive(userId, Boolean(is_active))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { success: false, error: 'Error actualizando usuario' },
      { status: 500 }
    )
  }
}
