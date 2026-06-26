import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { userRepository } from '@/lib/repositories'
import { loanRepository } from '@/lib/repositories'

interface Params {
  id: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params
    const userId = parseInt(id)

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
  { params }: { params: Promise<Params> }
) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const { id } = await params
    const userId = parseInt(id, 10)

    if (isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const {
      empr_nom,
      empr_prenom,
      empr_cb,
      empr_mail,
      empr_tel1,
      empr_sexe,
      empr_year,
      empr_ville,
      empr_date_adhesion,
      empr_date_expiration,
      empr_categ,
      groupId,
      is_active
    } = await request.json()

    if (
      empr_nom !== undefined ||
      empr_prenom !== undefined ||
      empr_cb !== undefined ||
      empr_mail !== undefined ||
      empr_tel1 !== undefined ||
      empr_sexe !== undefined ||
      empr_year !== undefined ||
      empr_ville !== undefined ||
      empr_date_adhesion !== undefined ||
      empr_date_expiration !== undefined ||
      empr_categ !== undefined ||
      groupId !== undefined
    ) {
      await userRepository.updateUser(userId, {
        empr_nom: empr_nom !== undefined ? String(empr_nom).trim() : undefined,
        empr_prenom: empr_prenom !== undefined ? String(empr_prenom).trim() : undefined,
        empr_cb: empr_cb !== undefined ? (empr_cb ? String(empr_cb).trim() : null) : undefined,
        empr_mail: empr_mail !== undefined ? String(empr_mail).trim() : undefined,
        empr_tel1: empr_tel1 !== undefined ? String(empr_tel1).trim() : undefined,
        empr_sexe: empr_sexe !== undefined ? Number(empr_sexe) : undefined,
        empr_year: empr_year !== undefined ? Number(empr_year) : undefined,
        empr_ville: empr_ville !== undefined ? String(empr_ville).trim() : undefined,
        empr_date_adhesion: empr_date_adhesion !== undefined ? (empr_date_adhesion ? String(empr_date_adhesion).trim() : null) : undefined,
        empr_date_expiration: empr_date_expiration !== undefined ? (empr_date_expiration ? String(empr_date_expiration).trim() : null) : undefined,
        empr_categ: empr_categ !== undefined ? Number(empr_categ) : undefined,
        groupId: groupId !== undefined ? (groupId !== null ? Number(groupId) : null) : undefined
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
