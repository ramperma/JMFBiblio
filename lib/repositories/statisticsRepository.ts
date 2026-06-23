import { RowDataPacket } from 'mysql2/promise'
import { getDbConnection } from '../db'

export interface Statistics {
  totalBooks: number
  totalCopies: number
  totalUsers: number
  activeLoans: number
  overdueLoans: number
}

export interface TopBook {
  notice_id: number
  tit1: string
  loan_count: number
}

export interface TopBorrower {
  id_empr: number
  empr_nom: string
  empr_prenom: string | null
  active_loan_count: number
}

async function countWhere(conn: Awaited<ReturnType<typeof getDbConnection>>, sql: string, params: Array<string | number> = []) {
  const [rows] = await conn.query(sql, params)
  return (rows as RowDataPacket[])[0].total as number
}

export const statisticsRepository = {
  async getStatistics(): Promise<Statistics> {
    const conn = await getDbConnection()

    const [booksRows] = await conn.query('SELECT COUNT(*) AS total FROM notices')
    const totalBooks = (booksRows as RowDataPacket[])[0].total as number

    const [copiesRows] = await conn.query('SELECT COUNT(*) AS total FROM exemplaires')
    const totalCopies = (copiesRows as RowDataPacket[])[0].total as number

    const [usersRows] = await conn.query('SELECT COUNT(*) AS total FROM empr')
    const totalUsers = (usersRows as RowDataPacket[])[0].total as number

    const activeLoans = await countWhere(
      conn,
      'SELECT COUNT(*) AS total FROM pret WHERE pret_arc_id = 0'
    )

    const overdueLoans = await countWhere(
      conn,
      `SELECT COUNT(*) AS total FROM pret
       WHERE pret_arc_id = 0
         AND pret_retour < CURDATE()`
    )

    return {
      totalBooks,
      totalCopies,
      totalUsers,
      activeLoans,
      overdueLoans
    }
  },

  async getTopBorrowedBooks(limit = 5): Promise<TopBook[]> {
    const conn = await getDbConnection()

    const [rows] = await conn.query(
      `SELECT n.notice_id, n.tit1, COUNT(*) AS loan_count
       FROM pret p
       JOIN exemplaires e ON e.expl_id = p.pret_idexpl
       JOIN notices n ON n.notice_id = e.expl_notice
       WHERE p.pret_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY n.notice_id, n.tit1
       ORDER BY loan_count DESC, n.tit1 ASC
       LIMIT ?`,
      [limit]
    )

    return (rows as RowDataPacket[]).map(row => ({
      notice_id: row.notice_id as number,
      tit1: row.tit1 as string,
      loan_count: row.loan_count as number
    }))
  },

  async getTopBorrowers(limit = 5): Promise<TopBorrower[]> {
    const conn = await getDbConnection()

    const [rows] = await conn.query(
      `SELECT u.id_empr, u.empr_nom, u.empr_prenom, COUNT(*) AS active_loan_count
       FROM pret p
       JOIN empr u ON u.id_empr = p.pret_idempr
       WHERE p.pret_arc_id = 0
       GROUP BY u.id_empr, u.empr_nom, u.empr_prenom
       ORDER BY active_loan_count DESC, u.empr_nom ASC
       LIMIT ?`,
      [limit]
    )

    return (rows as RowDataPacket[]).map(row => ({
      id_empr: row.id_empr as number,
      empr_nom: row.empr_nom as string,
      empr_prenom: (row.empr_prenom as string | null) ?? null,
      active_loan_count: row.active_loan_count as number
    }))
  }
}
