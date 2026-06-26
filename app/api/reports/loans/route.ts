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
        e.expl_cb,
        e.expl_id,
        g.id_groupe,
        COALESCE(g.libelle_groupe, 'Sin Curso') AS libelle_groupe,
        DATEDIFF(p.pret_retour, CURDATE()) AS days_left
      FROM pret p
      JOIN exemplaires e ON e.expl_id = p.pret_idexpl
      JOIN notices n ON n.notice_id = e.expl_notice
      JOIN empr u ON u.id_empr = p.pret_idempr
      LEFT JOIN empr_groupe eg ON eg.empr_id = u.id_empr
      LEFT JOIN groupe g ON g.id_groupe = eg.groupe_id
      WHERE 1 = 1
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
    const activeLoans = rows as RowDataPacket[]

    if (format === 'pdf') {
      if (activeLoans.length === 0) {
        return NextResponse.json({ success: false, error: 'No hay préstamos activos para imprimir' }, { status: 400 })
      }

      // Group by course/group
      const groupData: Record<string, typeof activeLoans> = {}
      activeLoans.forEach(row => {
        const groupName = row.libelle_groupe
        if (!groupData[groupName]) groupData[groupName] = []
        groupData[groupName].push(row)
      })

      const doc = new PDFDocument({ size: 'A4', margin: 40 })
      const chunks: Buffer[] = []
      doc.on('data', chunk => chunks.push(chunk))

      const groups = Object.keys(groupData).sort()
      groups.forEach((groupName, grpIdx) => {
        if (grpIdx > 0) doc.addPage()

        // Page Header
        doc.fillColor('#003366')
           .font('Helvetica-Bold')
           .fontSize(14)
           .text(`INFORME DE PRÉSTAMOS ACTIVOS: ${groupName.toUpperCase()}`, 40, 40)

        const todayStr = new Date().toLocaleDateString('es-ES')
        doc.fillColor('#666666')
           .font('Helvetica')
           .fontSize(8)
           .text(`Fecha de generación: ${todayStr}`, 40, 56)

        // Draw Table Header
        let y = 80
        doc.rect(40, y, 515, 20).fill('#003366')
        
        doc.fillColor('#ffffff')
           .font('Helvetica-Bold')
           .fontSize(8)
           .text('Lector', 45, y + 6, { width: 140, ellipsis: true })
           .text('Libro', 190, y + 6, { width: 180, ellipsis: true })
           .text('Código', 380, y + 6, { width: 50 })
           .text('Prestado', 440, y + 6, { width: 45 })
           .text('Vence', 495, y + 6, { width: 50 })

        y += 20
        doc.fillColor('#000000').font('Helvetica')

        groupData[groupName].forEach((loan, idx) => {
          // Zebra striping
          if (idx % 2 === 1) {
            doc.rect(40, y, 515, 20).fill('#f9fafb')
          }
          
          doc.fillColor('#000000')
             .text(`${loan.empr_nom}, ${loan.empr_prenom || ''}`, 45, y + 6, { width: 140, height: 12, ellipsis: true })
             .text(loan.tit1, 190, y + 6, { width: 180, height: 12, ellipsis: true })
             .text(loan.expl_cb, 380, y + 6, { width: 50, height: 12 })
             .text(new Date(loan.pret_date).toLocaleDateString('es-ES'), 440, y + 6)

          const due = new Date(loan.pret_retour)
          const isOverdue = due < new Date()
          doc.fillColor(isOverdue ? '#b91c1c' : '#000000')
             .font(isOverdue ? 'Helvetica-Bold' : 'Helvetica')
             .text(due.toLocaleDateString('es-ES'), 495, y + 6)
          doc.font('Helvetica')

          // Draw separator line
          doc.moveTo(40, y + 20).lineTo(555, y + 20).lineWidth(0.5).strokeColor('#e5e7eb').stroke()

          y += 20

          // Add a new page if table overflows
          if (y > 750 && idx < groupData[groupName].length - 1) {
            doc.addPage()
            y = 40
            // Redraw headers on new page
            doc.rect(40, y, 515, 20).fill('#003366')
            doc.fillColor('#ffffff').font('Helvetica-Bold')
               .text('Lector', 45, y + 6, { width: 140 })
               .text('Libro', 190, y + 6, { width: 180 })
               .text('Código', 380, y + 6, { width: 50 })
               .text('Prestado', 440, y + 6, { width: 45 })
               .text('Vence', 495, y + 6, { width: 50 })
            y += 20
            doc.fillColor('#000000').font('Helvetica')
          }
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
          'Content-Disposition': 'inline; filename="prestamos-activos.pdf"'
        }
      })
    }

    return NextResponse.json({ success: true, data: activeLoans })
  } catch (error) {
    console.error('Error fetching active loans report:', error)
    return NextResponse.json({ success: false, error: 'Error al cargar el informe de préstamos activos' }, { status: 500 })
  }
}
