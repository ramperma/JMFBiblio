import { getDbConnection } from '../db'
import { RowDataPacket } from 'mysql2/promise'

export interface Loan {
  pret_id: number
  pret_date: Date
  pret_retour?: Date
  pret_idexpl: number
  pret_idempr: number
  cpt_prolongation?: number
  book_title?: string
  user_name?: string
}

export interface LoanDetail extends Loan {
  tit1: string
  empr_nom: string
  empr_prenom?: string
  expl_id: number
  expl_cb?: string
}

export const loanRepository = {
  async getLoansPaginated(
    page: number,
    pageSize: number,
    options?: {
      userId?: number
      activeOnly?: boolean
      borrower?: string
      book?: string
      dateFrom?: string
      dateTo?: string
      sortBy?: 'pret_id' | 'pret_date' | 'pret_retour' | 'tit1' | 'empr_nom'
      sortDir?: 'asc' | 'desc'
    }
  ) {
    const conn = await getDbConnection()
    const offset = (page - 1) * pageSize

    const conditions: string[] = []
    const params: Array<number | string> = []

    if (options?.userId) {
      conditions.push('p.pret_idempr = ?')
      params.push(options.userId)
    }

    if (options?.activeOnly) {
      conditions.push('p.pret_retour >= CURDATE()')
    }

    if (options?.borrower) {
      conditions.push('(u.empr_nom LIKE ? OR u.empr_prenom LIKE ?)')
      params.push(`%${options.borrower}%`, `%${options.borrower}%`)
    }

    if (options?.book) {
      conditions.push('n.tit1 LIKE ?')
      params.push(`%${options.book}%`)
    }

    if (options?.dateFrom) {
      conditions.push('DATE(p.pret_date) >= ?')
      params.push(options.dateFrom)
    }

    if (options?.dateTo) {
      conditions.push('DATE(p.pret_date) <= ?')
      params.push(options.dateTo)
    }

    const sortMap: Record<string, string> = {
      pret_id: 'p.pret_idexpl',
      pret_date: 'p.pret_date',
      pret_retour: 'p.pret_retour',
      tit1: 'n.tit1',
      empr_nom: 'u.empr_nom'
    }
    const safeSortBy = sortMap[options?.sortBy || 'pret_date'] || 'p.pret_date'
    const safeSortDir = options?.sortDir === 'asc' ? 'ASC' : 'DESC'

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS total
       FROM pret p
       JOIN exemplaires e ON e.expl_id = p.pret_idexpl
       JOIN notices n ON n.notice_id = e.expl_notice
       JOIN empr u ON u.id_empr = p.pret_idempr
       ${whereClause}`,
      params
    )
    const total = (countRows as RowDataPacket[])[0].total as number

    const [rows] = await conn.query(
      `SELECT
        p.pret_idexpl AS pret_id,
        p.pret_date,
        p.pret_retour,
        p.pret_idexpl,
        p.pret_idempr,
        p.cpt_prolongation,
        n.tit1,
        u.empr_nom,
        u.empr_prenom,
        e.expl_id,
        e.expl_cb
       FROM pret p
       JOIN exemplaires e ON e.expl_id = p.pret_idexpl
       JOIN notices n ON n.notice_id = e.expl_notice
       JOIN empr u ON u.id_empr = p.pret_idempr
       ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortDir}
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )

    const data = (rows as RowDataPacket[]).map(row => ({
      pret_id: row.pret_id,
      pret_date: row.pret_date,
      pret_retour: row.pret_retour,
      pret_idexpl: row.pret_idexpl,
      pret_idempr: row.pret_idempr,
      cpt_prolongation: row.cpt_prolongation as number,
      tit1: row.tit1,
      empr_nom: row.empr_nom,
      empr_prenom: row.empr_prenom,
      expl_id: row.expl_id,
      expl_cb: row.expl_cb
    }))

    return { data, total }
  },

  async createLoan(explCb: string, idEmpr: number, maxLoanDays: number) {
    const conn = await getDbConnection()

    const [exRows] = await conn.query(
      'SELECT expl_id FROM exemplaires WHERE expl_cb = ?',
      [explCb]
    )
    const exArr = exRows as RowDataPacket[]
    if (exArr.length === 0) throw new Error('Código de barras no encontrado')
    const explId = exArr[0].expl_id as number

    const [pRows] = await conn.query(
      'SELECT pret_idexpl FROM pret WHERE pret_idexpl = ?',
      [explId]
    )
    if ((pRows as RowDataPacket[]).length > 0) throw new Error('El ejemplar ya está prestado')

    const [emprRows] = await conn.query(
      'SELECT id_empr FROM empr WHERE id_empr = ?',
      [idEmpr]
    )
    if ((emprRows as RowDataPacket[]).length === 0) throw new Error('Usuario no encontrado')

    const retour = new Date()
    retour.setDate(retour.getDate() + maxLoanDays)
    const retourStr = retour.toISOString().slice(0, 10)

    await conn.query(
      `INSERT INTO pret
       (pret_idexpl, pret_idempr, pret_date, pret_retour, pret_arc_id,
        niveau_relance, date_relance, printed, retour_initial,
        cpt_prolongation, pret_temp, short_loan_flag)
       VALUES (?, ?, NOW(), ?, 0, 0, '0000-00-00', 0, ?, 0, '', 0)`,
      [explId, idEmpr, retourStr, retourStr]
    )

    return { explId, idEmpr, retourStr }
  },

  async returnLoan(explId: number) {
    const conn = await getDbConnection()
    const [pRows] = await conn.query(
      'SELECT pret_idexpl FROM pret WHERE pret_idexpl = ?',
      [explId]
    )
    if ((pRows as RowDataPacket[]).length === 0) throw new Error('Préstamo no encontrado')
    await conn.query('DELETE FROM pret WHERE pret_idexpl = ?', [explId])
  },

  async renewLoan(explId: number, maxLoanDays: number, maxRenewals: number) {
    const conn = await getDbConnection()
    const [pRows] = await conn.query(
      'SELECT pret_idexpl, cpt_prolongation FROM pret WHERE pret_idexpl = ?',
      [explId]
    )
    const loan = (pRows as RowDataPacket[])[0]
    if (!loan) throw new Error('Préstamo no encontrado')
    if (loan.cpt_prolongation >= maxRenewals) {
      throw new Error('Máximo de renovaciones alcanzado')
    }

    const newRetour = new Date()
    newRetour.setDate(newRetour.getDate() + maxLoanDays)
    const retourStr = newRetour.toISOString().slice(0, 10)

    await conn.query(
      'UPDATE pret SET pret_retour = ?, cpt_prolongation = cpt_prolongation + 1 WHERE pret_idexpl = ?',
      [retourStr, explId]
    )

    return { retourStr }
  },

  async getAllLoans(): Promise<LoanDetail[]> {
    const conn = await getDbConnection()
    const [rows] = await conn.query(
      `SELECT
        p.pret_idexpl AS pret_id,
        p.pret_date,
        p.pret_retour,
        p.pret_idexpl,
        p.pret_idempr,
        n.tit1,
        u.empr_nom,
        e.expl_id
       FROM pret p
       JOIN exemplaires e ON e.expl_id = p.pret_idexpl
       JOIN notices n ON n.notice_id = e.expl_notice
       JOIN empr u ON u.id_empr = p.pret_idempr
       ORDER BY p.pret_date DESC
       LIMIT 100`
    )
    
    return (rows as RowDataPacket[]).map(row => ({
      pret_id: row.pret_id,
      pret_date: row.pret_date,
      pret_retour: row.pret_retour,
      pret_idexpl: row.pret_idexpl,
      pret_idempr: row.pret_idempr,
      tit1: row.tit1,
      empr_nom: row.empr_nom,
      expl_id: row.expl_id
    }))
  },

  async getLoansByUserId(userId: number): Promise<LoanDetail[]> {
    const conn = await getDbConnection()
    const [rows] = await conn.query(
      `SELECT
        p.pret_idexpl AS pret_id,
        p.pret_date,
        p.pret_retour,
        p.pret_idexpl,
        p.pret_idempr,
        n.tit1,
        u.empr_nom,
        e.expl_id
       FROM pret p
       JOIN exemplaires e ON e.expl_id = p.pret_idexpl
       JOIN notices n ON n.notice_id = e.expl_notice
       JOIN empr u ON u.id_empr = p.pret_idempr
       WHERE p.pret_idempr = ?
       ORDER BY p.pret_date DESC`,
      [userId]
    )
    
    return (rows as RowDataPacket[]).map(row => ({
      pret_id: row.pret_id,
      pret_date: row.pret_date,
      pret_retour: row.pret_retour,
      pret_idexpl: row.pret_idexpl,
      pret_idempr: row.pret_idempr,
      tit1: row.tit1,
      empr_nom: row.empr_nom,
      expl_id: row.expl_id
    }))
  },

  async getActiveLoans(userId?: number): Promise<LoanDetail[]> {
    const conn = await getDbConnection()
    
    let query = `SELECT
        p.pret_idexpl AS pret_id,
        p.pret_date,
        p.pret_retour,
        p.pret_idexpl,
        p.pret_idempr,
        n.tit1,
        u.empr_nom,
        e.expl_id
       FROM pret p
       JOIN exemplaires e ON e.expl_id = p.pret_idexpl
       JOIN notices n ON n.notice_id = e.expl_notice
       JOIN empr u ON u.id_empr = p.pret_idempr
       WHERE 1 = 1`
    
    let params: any[] = []
    
    if (userId) {
      query += ' AND p.pret_idempr = ?'
      params.push(userId)
    }
    
    query += ' ORDER BY p.pret_date DESC LIMIT 100'
    
    const [rows] = await conn.query(query, params)
    
    return (rows as RowDataPacket[]).map(row => ({
      pret_id: row.pret_id,
      pret_date: row.pret_date,
      pret_retour: row.pret_retour,
      pret_idexpl: row.pret_idexpl,
      pret_idempr: row.pret_idempr,
      tit1: row.tit1,
      empr_nom: row.empr_nom,
      expl_id: row.expl_id
    }))
  }
}
