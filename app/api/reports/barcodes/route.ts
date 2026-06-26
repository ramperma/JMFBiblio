import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import PDFDocument from 'pdfkit'
import { drawCode39 } from '@/lib/barcode'

export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const startStr = searchParams.get('start') || ''
  const countStr = searchParams.get('count') || '24'

  if (!startStr) {
    return NextResponse.json({ success: false, error: 'Código de inicio es requerido' }, { status: 400 })
  }

  const startVal = parseInt(startStr, 10)
  if (isNaN(startVal)) {
    return NextResponse.json({ success: false, error: 'Código de inicio inválido' }, { status: 400 })
  }

  const count = parseInt(countStr, 10)
  if (isNaN(count) || count <= 0 || count > 240) {
    return NextResponse.json({ success: false, error: 'Cantidad inválida (debe ser entre 1 y 240)' }, { status: 400 })
  }

  try {
    const doc = new PDFDocument({ size: 'A4', margin: 20 })
    const chunks: Buffer[] = []
    doc.on('data', chunk => chunks.push(chunk))

    const isZeroPadded = startStr.startsWith('0') && startStr.length > 1
    const padLength = startStr.length

    // Grid layout: 3 columns, 8 rows = 24 barcodes per page
    const leftMargin = 30
    const topMargin = 40
    const colGap = 15
    const rowGap = 15

    // Total width of labels on A4 (595.28 points)
    // 3 columns of ~165 points = 495 points + 2 * 15 gap = 525 points (fits nicely inside 595.28 width)
    const labelWidth = 165
    const labelHeight = 85

    const colsPerPage = 3
    const rowsPerPage = 8
    const barcodesPerPage = colsPerPage * rowsPerPage

    for (let i = 0; i < count; i++) {
      const pageIndex = i % barcodesPerPage
      const col = pageIndex % colsPerPage
      const row = Math.floor(pageIndex / colsPerPage)

      if (i > 0 && pageIndex === 0) {
        doc.addPage()
      }

      const x = leftMargin + col * (labelWidth + colGap)
      const y = topMargin + row * (labelHeight + rowGap)

      // Barcode value
      const currentVal = startVal + i
      const barcodeText = isZeroPadded
        ? String(currentVal).padStart(padLength, '0')
        : String(currentVal)

      // Draw border box for label alignment
      doc.rect(x, y, labelWidth, labelHeight)
         .lineWidth(0.5)
         .strokeColor('#e5e7eb')
         .stroke()

      // Header Text
      doc.fillColor('#003366')
         .font('Helvetica-Bold')
         .fontSize(7)
         .text('BIBLIOTECA J.M. FERNÁNDEZ', x + 5, y + 8, { width: labelWidth - 10, align: 'center' })

      // Draw barcode (drawCode39 expects x, y, value, height, narrowBarWidth)
      // Let's place it at x + offset, y + 22. Code 39 width is around (chars + 2) * 9 * width.
      // E.g. for a 6 char code, width is 8 * 9 * 1 = 72 points.
      const code39Width = (barcodeText.length + 2) * 9 * 0.95
      const barcodeX = x + (labelWidth - code39Width) / 2
      
      try {
        drawCode39(doc, barcodeX, y + 22, barcodeText, 35, 0.9)
      } catch (err) {
        console.error('Error drawing barcode:', err)
      }

      // Footer Label Text
      doc.fillColor('#333333')
         .font('Helvetica')
         .fontSize(8)
         .text(barcodeText, x + 5, y + 65, { width: labelWidth - 10, align: 'center' })
    }

    doc.end()

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', err => reject(err))
    })

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="codigos-barra-${startStr}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generating barcodes PDF:', error)
    return NextResponse.json({ success: false, error: 'Error al generar los códigos de barras' }, { status: 500 })
  }
}
