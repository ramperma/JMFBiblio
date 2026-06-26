import { NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { basketRepository } from '@/lib/repositories'
import PDFDocument from 'pdfkit'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  try {
    const items = await basketRepository.getBasketItems('Tejuelos')
    if (items.length === 0) {
      return NextResponse.json({ success: false, error: 'No hay elementos en la cesta de Tejuelos' }, { status: 400 })
    }

    // A4 sheet: 595.28 x 841.89 points
    const doc = new PDFDocument({ size: 'A4', margin: 20 })
    const chunks: Buffer[] = []

    doc.on('data', chunk => chunks.push(chunk))

    // 1 mm = 2.834645 points
    const mmToPoints = 2.834645
    const labelWidth = 25 * mmToPoints // 70.86 points
    const labelHeight = 26 * mmToPoints // 73.70 points

    const leftMargin = 30
    const topMargin = 40
    const colGap = 10
    const rowGap = 10

    const colsPerPage = 6
    const rowsPerPage = 9
    const itemsPerPage = colsPerPage * rowsPerPage

    items.forEach((item, index) => {
      const pageIndex = index % itemsPerPage
      const col = pageIndex % colsPerPage
      const row = Math.floor(pageIndex / colsPerPage)

      if (index > 0 && pageIndex === 0) {
        doc.addPage()
      }

      const x = leftMargin + col * (labelWidth + colGap)
      const y = topMargin + row * (labelHeight + rowGap)

      // Draw border
      doc.rect(x, y, labelWidth, labelHeight)
         .lineWidth(0.5)
         .strokeColor('#aaaaaa')
         .stroke()

      // Print signatura (split by spaces to show in multiple lines)
      const text = item.expl_cote || ''
      const parts = text.split(/\s+/).filter(p => p.trim().length > 0)

      doc.fillColor('#000000')
         .font('Helvetica-Bold')
         .fontSize(8)

      // Calculate vertical spacing
      const lineHeight = 10
      const totalTextHeight = parts.length * lineHeight
      const startY = y + (labelHeight - totalTextHeight) / 2

      parts.forEach((part, partIdx) => {
        doc.text(part, x + 2, startY + partIdx * lineHeight, {
          width: labelWidth - 4,
          align: 'center'
        })
      })
    })

    doc.end()

    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', err => reject(err))
    })

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="tejuelos.pdf"'
      }
    })
  } catch (error) {
    console.error('Error generating Tejuelos PDF:', error)
    return NextResponse.json({ success: false, error: 'Error al generar los tejuelos' }, { status: 500 })
  }
}
