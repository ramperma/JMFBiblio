import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { getDbConnection } from '@/lib/db'
import { RowDataPacket } from 'mysql2/promise'
import PDFDocument from 'pdfkit'

export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format')
  const groupIdsParam = searchParams.get('groupIds') // comma-separated group IDs

  try {
    const conn = await getDbConnection()

    let query = `
      SELECT
        p.pret_idexpl AS pret_id,
        p.pret_date,
        p.pret_retour,
        n.tit1,
        u.id_empr,
        u.empr_nom,
        u.empr_prenom,
        u.empr_mail,
        e.expl_cb,
        e.expl_id,
        g.id_groupe,
        COALESCE(g.libelle_groupe, 'Sin Curso') AS libelle_groupe,
        DATEDIFF(CURDATE(), p.pret_retour) AS days_overdue
      FROM pret p
      JOIN exemplaires e ON e.expl_id = p.pret_idexpl
      JOIN notices n ON n.notice_id = e.expl_notice
      JOIN empr u ON u.id_empr = p.pret_idempr
      LEFT JOIN empr_groupe eg ON eg.empr_id = u.id_empr
      LEFT JOIN groupe g ON g.id_groupe = eg.groupe_id
      WHERE p.pret_retour < CURDATE()
    `
    const queryParams: any[] = []

    if (groupIdsParam) {
      const ids = groupIdsParam.split(',').map(Number).filter(n => !isNaN(n))
      if (ids.length > 0) {
        query += ` AND (g.id_groupe IN (${ids.map(() => '?').join(',')}) ${ids.includes(0) || groupIdsParam.includes('Sin Curso') ? 'OR g.id_groupe IS NULL' : ''})`
        queryParams.push(...ids.filter(id => id !== 0))
      }
    }

    query += ` ORDER BY g.libelle_groupe, u.empr_nom, u.empr_prenom`

    const [rows] = await conn.query(query, queryParams)
    const overdueLoans = rows as RowDataPacket[]

    if (format === 'pdf') {
      if (overdueLoans.length === 0) {
        return NextResponse.json({ success: false, error: 'No hay retrasos para imprimir' }, { status: 400 })
      }

      // Group loans by borrower
      const borrowerGroups: Record<number, {
        id_empr: number
        empr_nom: string
        empr_prenom: string | null
        libelle_groupe: string
        loans: Array<{
          tit1: string
          expl_cb: string
          pret_date: Date
          pret_retour: Date
          days_overdue: number
        }>
      }> = {}

      overdueLoans.forEach(row => {
        if (!borrowerGroups[row.id_empr]) {
          borrowerGroups[row.id_empr] = {
            id_empr: row.id_empr,
            empr_nom: row.empr_nom,
            empr_prenom: row.empr_prenom,
            libelle_groupe: row.libelle_groupe,
            loans: []
          }
        }
        borrowerGroups[row.id_empr].loans.push({
          tit1: row.tit1,
          expl_cb: row.expl_cb,
          pret_date: new Date(row.pret_date),
          pret_retour: new Date(row.pret_retour),
          days_overdue: row.days_overdue
        })
      })

      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const chunks: Buffer[] = []
      doc.on('data', chunk => chunks.push(chunk))

      const borrowers = Object.values(borrowerGroups)
      borrowers.forEach((borrower, bIdx) => {
        if (bIdx > 0) doc.addPage()

        // Card layout/border
        doc.rect(40, 40, 515, 760).lineWidth(1).strokeColor('#003366').stroke()

        // Header Title
        doc.fillColor('#003366')
           .font('Helvetica-Bold')
           .fontSize(16)
           .text('J.M. FERNÁNDEZ - BIBLIOTECA ESCOLAR', 50, 60, { align: 'center' })

        doc.fillColor('#666666')
           .font('Helvetica')
           .fontSize(10)
           .text('RECLAMACIÓN DE PRÉSTAMOS DE LIBROS', 50, 80, { align: 'center' })

        doc.moveTo(50, 95).lineTo(545, 95).lineWidth(0.5).strokeColor('#cccccc').stroke()

        // Date and recipient info
        const todayStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
        doc.fillColor('#333333')
           .font('Helvetica')
           .fontSize(10)
           .text(`Fecha: ${todayStr}`, 60, 115, { align: 'right' })

        doc.font('Helvetica-Bold')
           .fontSize(11)
           .text('Lector/a:', 60, 135)
           .font('Helvetica')
           .text(`${borrower.empr_nom}, ${borrower.empr_prenom || ''}`, 130, 135)

        doc.font('Helvetica-Bold')
           .text('Curso/Grupo:', 60, 155)
           .font('Helvetica')
           .text(borrower.libelle_groupe, 130, 155)

        doc.moveTo(50, 175).lineTo(545, 175).lineWidth(0.5).strokeColor('#cccccc').stroke()

        // Body message
        doc.fontSize(10)
           .fillColor('#222222')
           .text('Estimado/a alumno/a o tutor/a:', 60, 195)
           .moveDown(0.8)
           .text(
             'Le recordamos que tiene pendiente de devolución el/los siguiente(s) libro(s) prestado(s) por la biblioteca del centro, cuyo plazo de préstamo ya ha caducado. Le rogamos proceda a su entrega a la mayor brevedad posible.',
             { align: 'justify', width: 475 }
           )

        // List of overdue books
        let currentY = 270
        doc.fillColor('#333333')
           .font('Helvetica-Bold')
           .text('Libros vencidos:', 60, currentY)
        currentY += 18

        borrower.loans.forEach((loan) => {
          doc.rect(60, currentY, 475, 45).fillColor('#f9fafb').fill().strokeColor('#e5e7eb').stroke()

          doc.fillColor('#000000')
             .font('Helvetica-Bold')
             .fontSize(9)
             .text(loan.tit1, 70, currentY + 6, { width: 455, height: 12, ellipsis: true })

          const datePStr = loan.pret_date.toLocaleDateString('es-ES')
          const dateVStr = loan.pret_retour.toLocaleDateString('es-ES')

          doc.fillColor('#555555')
             .font('Helvetica')
             .fontSize(8)
             .text(`Código: ${loan.expl_cb}   |   Prestado: ${datePStr}   |   Vencimiento: ${dateVStr}`, 70, currentY + 20)

          doc.fillColor('#b91c1c')
             .font('Helvetica-Bold')
             .text(`Retraso: ${loan.days_overdue} días`, 70, currentY + 32)

          currentY += 55
        })

        // Signatures / Footer
        const signatureY = 620
        doc.fillColor('#444444')
           .font('Helvetica')
           .fontSize(10)
           .text('Atentamente,', 60, signatureY)
           .moveDown(3)
           .font('Helvetica-Bold')
           .text('El Responsable de la Biblioteca / Dirección', 60, signatureY + 45)
      })

      doc.end()

      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', err => reject(err))
      })

      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="cartas-retraso.pdf"'
        }
      })
    }

    return NextResponse.json({ success: true, data: overdueLoans })
  } catch (error) {
    console.error('Error fetching delay report:', error)
    return NextResponse.json({ success: false, error: 'Error al cargar el informe de retrasos' }, { status: 500 })
  }
}
