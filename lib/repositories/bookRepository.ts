import { getDbConnection } from '../db'
import { Book, BookDetail } from '../types'
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

let stateInitialized = false

async function ensureBookStateTable() {
  if (stateInitialized) {
    return
  }

  const conn = await getDbConnection()
  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_book_state (
      notice_id INT UNSIGNED NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (notice_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  stateInitialized = true
}

export const bookRepository = {
  async getBooksPaginated(
    page: number,
    pageSize: number,
    query?: string,
    sortBy: 'notice_id' | 'tit1' | 'year' | 'code' = 'tit1',
    sortDir: 'asc' | 'desc' = 'asc',
    includeInactive = false
  ) {
    await ensureBookStateTable()

    const conn = await getDbConnection()
    const offset = (page - 1) * pageSize

    const conditions: string[] = []
    const searchParams: Array<string | number> = []

    if (query) {
      conditions.push('n.tit1 LIKE ?')
      searchParams.push(`%${query}%`)
    }

    if (!includeInactive) {
      conditions.push('COALESCE(s.is_active, 1) = 1')
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS total
       FROM notices n
       LEFT JOIN app_book_state s ON s.notice_id = n.notice_id
       ${whereClause}`,
      searchParams
    )
    const total = (countRows as RowDataPacket[])[0].total as number

    const sortMap: Record<string, string> = {
      notice_id: 'n.notice_id',
      tit1: 'n.tit1',
      year: 'n.year',
      code: 'n.code'
    }
    const safeSortBy = sortMap[sortBy] || 'n.tit1'
    const safeSortDir = sortDir === 'desc' ? 'DESC' : 'ASC'

    const [rows] = await conn.query(
      `SELECT n.notice_id, n.tit1, n.year, n.code, COALESCE(s.is_active, 1) AS is_active
       FROM notices n
       LEFT JOIN app_book_state s ON s.notice_id = n.notice_id
       ${whereClause}
       ORDER BY ${safeSortBy} ${safeSortDir}
       LIMIT ? OFFSET ?`,
      [...searchParams, pageSize, offset]
    )

    const data = (rows as RowDataPacket[]).map(row => ({
      notice_id: row.notice_id,
      tit1: row.tit1,
      year: row.year,
      code: row.code,
      is_active: row.is_active === 1
    }))

    return { data, total }
  },

  async createBook(input: { tit1: string; year?: string; code?: string }) {
    const conn = await getDbConnection()
    const [result] = await conn.query(
      `INSERT INTO notices (
        typdoc, tit1, year, code, n_gen, n_contenu, n_resume, lien,
        index_l, index_matieres, commentaire_gestion, signature, thumbnail_url,
        indexation_lang, map_equinoxe
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'a',
        input.tit1,
        input.year || null,
        input.code || '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]
    )

    return (result as ResultSetHeader).insertId
  },

  async updateBook(noticeId: number, input: { tit1?: string; year?: string; code?: string }) {
    const conn = await getDbConnection()
    const updates: string[] = []
    const params: Array<string | number | null> = []

    if (input.tit1 !== undefined) {
      updates.push('tit1 = ?')
      params.push(input.tit1)
    }

    if (input.year !== undefined) {
      updates.push('year = ?')
      params.push(input.year || null)
    }

    if (input.code !== undefined) {
      updates.push('code = ?')
      params.push(input.code)
    }

    if (updates.length === 0) {
      return
    }

    params.push(noticeId)
    await conn.query(`UPDATE notices SET ${updates.join(', ')} WHERE notice_id = ?`, params)
  },

  async setBookActive(noticeId: number, isActive: boolean) {
    await ensureBookStateTable()
    const conn = await getDbConnection()
    await conn.query(
      `INSERT INTO app_book_state (notice_id, is_active)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE is_active = VALUES(is_active)`,
      [noticeId, isActive ? 1 : 0]
    )
  },

  async getAllBooks(): Promise<Book[]> {
    const conn = await getDbConnection()
    const [rows] = await conn.query(
      'SELECT notice_id, tit1, year, code FROM notices ORDER BY tit1'
    )
    return (rows as RowDataPacket[]).map(row => ({
      notice_id: row.notice_id,
      tit1: row.tit1,
      year: row.year,
      code: row.code
    }))
  },

  async getBookById(noticeId: number): Promise<BookDetail | null> {
    await ensureBookStateTable()
    const conn = await getDbConnection()
    
    // Get book details
    const [bookRows] = await conn.query(
      `SELECT n.notice_id, n.tit1, n.year, n.code, COALESCE(s.is_active, 1) AS is_active
       FROM notices n
       LEFT JOIN app_book_state s ON s.notice_id = n.notice_id
       WHERE n.notice_id = ?`,
      [noticeId]
    )
    
    if ((bookRows as RowDataPacket[]).length === 0) {
      return null
    }
    
    const book = (bookRows as RowDataPacket[])[0]
    
    // Get copies
    const [copiesRows] = await conn.query(
      'SELECT expl_id, expl_statut FROM exemplaires WHERE expl_notice = ?',
      [noticeId]
    )
    
    const copies = (copiesRows as RowDataPacket[]).map(row => ({
      expl_id: row.expl_id,
      expl_statut: row.expl_statut,
      expl_notice: row.expl_notice
    }))
    
    // Get authors
    const [authorsRows] = await conn.query(
      `SELECT DISTINCT a.author_name
       FROM authors a
       JOIN responsability r ON r.resp_author = a.author_id
       WHERE r.resp_notice = ?`,
      [noticeId]
    )
    
    const authors = (authorsRows as RowDataPacket[]).map(row => row.author_name)
    
    return {
      notice_id: book.notice_id,
      tit1: book.tit1,
      year: book.year,
      code: book.code,
      is_active: book.is_active === 1,
      authors,
      copies
    }
  },

  async searchBooks(query: string): Promise<Book[]> {
    const conn = await getDbConnection()
    const searchQuery = `%${query}%`
    
    const [rows] = await conn.query(
      'SELECT notice_id, tit1, year, code FROM notices WHERE tit1 LIKE ? ORDER BY tit1',
      [searchQuery]
    )
    
    return (rows as RowDataPacket[]).map(row => ({
      notice_id: row.notice_id,
      tit1: row.tit1,
      year: row.year,
      code: row.code
    }))
  },

  async getAvailableCopies(q?: string) {
    const conn = await getDbConnection()
    const conditions: string[] = ['e.expl_id NOT IN (SELECT pret_idexpl FROM pret)']
    const params: string[] = []

    if (q) {
      conditions.push('(e.expl_cb LIKE ? OR n.tit1 LIKE ?)')
      params.push(`%${q}%`, `%${q}%`)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const [rows] = await conn.query(
      `SELECT e.expl_id, e.expl_cb, n.notice_id, n.tit1
       FROM exemplaires e
       JOIN notices n ON n.notice_id = e.expl_notice
       ${where}
       ORDER BY n.tit1
       LIMIT 30`,
      params
    )

    return (rows as RowDataPacket[]).map(row => ({
      expl_id: row.expl_id as number,
      expl_cb: row.expl_cb as string,
      notice_id: row.notice_id as number,
      tit1: row.tit1 as string
    }))
  }
}
