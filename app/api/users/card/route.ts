import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { userRepository } from '@/lib/repositories'
import PDFDocument from 'pdfkit'
import { drawCode39 } from '@/lib/barcode'

export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const idStr = searchParams.get('id')
    if (!idStr) {
      return NextResponse.json({ success: false, error: 'ID de usuario es requerido' }, { status: 400 })
    }

    const userId = parseInt(idStr, 10)
    const user = await userRepository.getUserById(userId)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    // A4 document size
    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    const chunks: Buffer[] = []

    doc.on('data', chunk => chunks.push(chunk))

    // Card dimensions (9.2cm x 5.8cm approx)
    const cardWidth = 260
    const cardHeight = 165
    const cardX = (595.28 - cardWidth) / 2
    const cardY = 180

    // Draw background/card box
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 6)
       .lineWidth(1)
       .strokeColor('#003366')
       .stroke()

    // Title / Header
    doc.fillColor('#003366')
       .fontSize(11)
       .font('Helvetica-Bold')
       .text('J.M. FERNÁNDEZ', cardX + 15, cardY + 15, { width: cardWidth - 30, align: 'center' })

    doc.fillColor('#666666')
       .fontSize(8)
       .font('Helvetica')
       .text('CARNET DE BIBLIOTECA', cardX + 15, cardY + 28, { width: cardWidth - 30, align: 'center' })

    // Divider Line
    doc.moveTo(cardX + 15, cardY + 40)
       .lineTo(cardX + cardWidth - 15, cardY + 40)
       .strokeColor('#cccccc')
       .lineWidth(0.5)
       .stroke()

    // Left Column: User details
    doc.fillColor('#333333')
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('Lector:', cardX + 15, cardY + 50)
       .font('Helvetica')
       .text(`${user.empr_nom}, ${user.empr_prenom || ''}`, cardX + 60, cardY + 50, { width: cardWidth - 75 })

    doc.font('Helvetica-Bold')
       .text('Curso:', cardX + 15, cardY + 74)
       .font('Helvetica')
       .text(user.user_groups || 'Sin curso / Profesor', cardX + 60, cardY + 74, { width: cardWidth - 75 })

    doc.font('Helvetica-Bold')
       .text('Vence:', cardX + 15, cardY + 89)
       .font('Helvetica')
       .text(user.empr_date_expiration ? new Date(user.empr_date_expiration).toLocaleDateString('es-ES') : 'Indefinido', cardX + 60, cardY + 89)

    // Barcode: centered at the bottom of the card
    const barcodeText = user.empr_cb || String(user.id_empr).padStart(5, '0')
    const barcodeWidth = (barcodeText.length + 2) * 9 * 1.05 + 10 // Est
    const barcodeX = cardX + (cardWidth - barcodeWidth) / 2

    // Draw Code 39 Barcode
    drawCode39(doc, barcodeX, cardY + 110, barcodeText, 25, 1.0)

    // Barcode text label
    doc.fillColor('#444444')
       .fontSize(8)
       .font('Helvetica')
       .text(barcodeText, cardX + 15, cardY + 140, { width: cardWidth - 30, align: 'center' })

    // Close document
    doc.end()

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', err => reject(err))
    })

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="carnet-${userId}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generating user card PDF:', error)
    return NextResponse.json(
      { success: false, error: 'Error al generar el PDF del carnet' },
      { status: 500 }
    )
  }
}
