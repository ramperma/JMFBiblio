import { getDbConnection } from '../db'
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

export interface User {
  id_empr: number
  empr_nom: string
  empr_prenom?: string
  empr_cb?: string
  empr_mail?: string
  empr_tel1?: string
  is_active?: boolean
  user_groups?: string
  empr_sexe?: number
  empr_year?: number
  empr_ville?: string
  empr_date_adhesion?: string | null
  empr_date_expiration?: string | null
  empr_categ?: number
}

let userStateInitialized = false

async function ensureUserStateTable() {
  if (userStateInitialized) {
    return
  }

  const conn = await getDbConnection()
  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_user_state (
      id_empr INT UNSIGNED NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id_empr)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  userStateInitialized = true
}

export const userRepository = {
  async getUsersPaginated(
    page: number,
    pageSize: number,
    query?: string,
    sortBy:
      | 'id_empr'
      | 'empr_nom'
      | 'empr_prenom'
      | 'empr_cb'
      | 'empr_mail'
      | 'empr_tel1' = 'empr_nom',
    sortDir: 'asc' | 'desc' = 'asc',
    includeInactive = false,
    groupId?: number
  ) {
    await ensureUserStateTable()

    const conn = await getDbConnection()
    const offset = (page - 1) * pageSize

    const conditions: string[] = []
    const searchParams: Array<string | number> = []

    if (query) {
      conditions.push('(u.empr_nom LIKE ? OR u.empr_prenom LIKE ? OR u.empr_cb LIKE ?)')
      searchParams.push(`%${query}%`, `%${query}%`, `%${query}%`)
    }

    if (!includeInactive) {
      conditions.push('COALESCE(s.is_active, 1) = 1')
    }

    if (groupId) {
      conditions.push('u.id_empr IN (SELECT empr_id FROM empr_groupe WHERE groupe_id = ?)')
      searchParams.push(groupId)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const [countRows] = await conn.query(
      `SELECT COUNT(*) AS total
       FROM empr u
       LEFT JOIN app_user_state s ON s.id_empr = u.id_empr
       ${whereClause}`,
      searchParams
    )
    const total = (countRows as RowDataPacket[])[0].total as number

    const sortMap: Record<string, string> = {
      id_empr: 'u.id_empr',
      empr_nom: 'u.empr_nom',
      empr_prenom: 'u.empr_prenom',
      empr_cb: 'u.empr_cb',
      empr_mail: 'u.empr_mail',
      empr_tel1: 'u.empr_tel1'
    }
    const safeSortBy = sortMap[sortBy] || 'u.empr_nom'
    const safeSortDir = sortDir === 'desc' ? 'DESC' : 'ASC'

    const [rows] = await conn.query(
      `SELECT u.id_empr, u.empr_nom, u.empr_prenom, u.empr_cb, u.empr_mail, u.empr_tel1,
          u.empr_sexe, u.empr_year, u.empr_ville, u.empr_categ,
          DATE_FORMAT(u.empr_date_adhesion, '%Y-%m-%d') AS empr_date_adhesion,
          DATE_FORMAT(u.empr_date_expiration, '%Y-%m-%d') AS empr_date_expiration,
          COALESCE(s.is_active, 1) AS is_active,
          (SELECT GROUP_CONCAT(g.libelle_groupe SEPARATOR ', ')
           FROM empr_groupe eg
           JOIN groupe g ON g.id_groupe = eg.groupe_id
           WHERE eg.empr_id = u.id_empr) AS user_groups,
          (SELECT eg.groupe_id FROM empr_groupe eg WHERE eg.empr_id = u.id_empr LIMIT 1) AS group_id
       FROM empr u
       LEFT JOIN app_user_state s ON s.id_empr = u.id_empr
       ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortDir}, u.id_empr ASC
       LIMIT ? OFFSET ?`,
      [...searchParams, pageSize, offset]
    )

    const data = (rows as RowDataPacket[]).map(row => ({
      id_empr: row.id_empr,
      empr_nom: row.empr_nom,
      empr_prenom: row.empr_prenom,
      empr_cb: row.empr_cb,
      empr_mail: row.empr_mail,
      empr_tel1: row.empr_tel1,
      is_active: row.is_active === 1,
      user_groups: row.user_groups || '',
      empr_sexe: row.empr_sexe,
      empr_year: row.empr_year,
      empr_ville: row.empr_ville,
      empr_date_adhesion: row.empr_date_adhesion,
      empr_date_expiration: row.empr_date_expiration,
      empr_categ: row.empr_categ,
      groupId: row.group_id || undefined
    }))

    return { data, total }
  },

  async createUser(input: {
    empr_nom: string
    empr_prenom: string
    empr_cb?: string
    empr_mail?: string
    empr_tel1?: string
    empr_sexe?: number
    empr_year?: number
    empr_ville?: string
    empr_date_adhesion?: string | null
    empr_date_expiration?: string | null
    empr_categ?: number
    groupId?: number
  }) {
    const conn = await getDbConnection()
    const loginBase = `${input.empr_nom}.${input.empr_prenom}`.toLowerCase().replace(/\s+/g, '_')
    const login = `${loginBase}_${Date.now()}`

    const adhesion = input.empr_date_adhesion || new Date().toISOString().split('T')[0]
    const expiration = input.empr_date_expiration || (() => {
      const d = new Date()
      d.setFullYear(d.getFullYear() + 1)
      return d.toISOString().split('T')[0]
    })()

    let finalCb = input.empr_cb ? input.empr_cb.trim() : ''
    if (!finalCb) {
      finalCb = await userRepository.getNextBarcode()
    }

    const [result] = await conn.query(
      `INSERT INTO empr (
        empr_nom, empr_prenom, empr_cb, empr_adr1, empr_adr2, empr_cp,
        empr_ville, empr_pays, empr_mail, empr_tel1, empr_tel2, empr_prof,
        empr_login, empr_password, empr_digest, cle_validation,
        empr_pnb_password, empr_pnb_password_hint,
        empr_sexe, empr_year, empr_date_adhesion, empr_date_expiration, empr_categ
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.empr_nom,
        input.empr_prenom,
        finalCb,
        '',
        '',
        '',
        input.empr_ville || 'Valencia',
        '',
        input.empr_mail || '',
        input.empr_tel1 || '',
        '',
        '',
        login,
        '',
        '',
        '',
        '',
        '',
        input.empr_sexe || 0,
        input.empr_year || 0,
        adhesion,
        expiration,
        input.empr_categ || 6
      ]
    )

    const insertId = (result as ResultSetHeader).insertId

    if (input.groupId) {
      await conn.query(
        'INSERT IGNORE INTO empr_groupe (empr_id, groupe_id) VALUES (?, ?)',
        [insertId, input.groupId]
      )
    }

    return insertId
  },

  async updateUser(
    id: number,
    input: {
      empr_nom?: string
      empr_prenom?: string
      empr_cb?: string | null
      empr_mail?: string
      empr_tel1?: string
      empr_sexe?: number
      empr_year?: number
      empr_ville?: string
      empr_date_adhesion?: string | null
      empr_date_expiration?: string | null
      empr_categ?: number
      groupId?: number | null
    }
  ) {
    const conn = await getDbConnection()
    const updates: string[] = []
    const params: Array<string | number | null> = []

    if (input.empr_nom !== undefined) {
      updates.push('empr_nom = ?')
      params.push(input.empr_nom)
    }
    if (input.empr_prenom !== undefined) {
      updates.push('empr_prenom = ?')
      params.push(input.empr_prenom)
    }
    if (input.empr_cb !== undefined) {
      updates.push('empr_cb = ?')
      params.push(input.empr_cb || null)
    }
    if (input.empr_mail !== undefined) {
      updates.push('empr_mail = ?')
      params.push(input.empr_mail)
    }
    if (input.empr_tel1 !== undefined) {
      updates.push('empr_tel1 = ?')
      params.push(input.empr_tel1)
    }
    if (input.empr_sexe !== undefined) {
      updates.push('empr_sexe = ?')
      params.push(input.empr_sexe)
    }
    if (input.empr_year !== undefined) {
      updates.push('empr_year = ?')
      params.push(input.empr_year)
    }
    if (input.empr_ville !== undefined) {
      updates.push('empr_ville = ?')
      params.push(input.empr_ville)
    }
    if (input.empr_date_adhesion !== undefined) {
      updates.push('empr_date_adhesion = ?')
      params.push(input.empr_date_adhesion)
    }
    if (input.empr_date_expiration !== undefined) {
      updates.push('empr_date_expiration = ?')
      params.push(input.empr_date_expiration)
    }
    if (input.empr_categ !== undefined) {
      updates.push('empr_categ = ?')
      params.push(input.empr_categ)
    }

    if (updates.length > 0) {
      params.push(id)
      await conn.query(`UPDATE empr SET ${updates.join(', ')} WHERE id_empr = ?`, params)
    }

    if (input.groupId !== undefined) {
      // Remove old groups
      await conn.query('DELETE FROM empr_groupe WHERE empr_id = ?', [id])
      if (input.groupId !== null && input.groupId > 0) {
        await conn.query('INSERT IGNORE INTO empr_groupe (empr_id, groupe_id) VALUES (?, ?)', [
          id,
          input.groupId
        ])
      }
    }
  },

  async setUserActive(id: number, isActive: boolean) {
    await ensureUserStateTable()
    const conn = await getDbConnection()
    await conn.query(
      `INSERT INTO app_user_state (id_empr, is_active)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE is_active = VALUES(is_active)`,
      [id, isActive ? 1 : 0]
    )
  },

  async getAllUsers(): Promise<User[]> {
    const conn = await getDbConnection()
    const [rows] = await conn.query(
      `SELECT id_empr, empr_nom, empr_prenom, empr_cb, empr_mail, empr_tel1
       FROM empr
       ORDER BY empr_nom, empr_prenom`
    )
    return (rows as RowDataPacket[]).map(row => ({
      id_empr: row.id_empr,
      empr_nom: row.empr_nom,
      empr_prenom: row.empr_prenom,
      empr_cb: row.empr_cb,
      empr_mail: row.empr_mail,
      empr_tel1: row.empr_tel1
    }))
  },

  async getUserById(userId: number): Promise<User & { groupId?: number } | null> {
    await ensureUserStateTable()
    const conn = await getDbConnection()
    const [rows] = await conn.query(
      `SELECT u.id_empr, u.empr_nom, u.empr_prenom, u.empr_cb, u.empr_mail, u.empr_tel1,
              u.empr_sexe, u.empr_year, u.empr_ville, u.empr_categ,
              DATE_FORMAT(u.empr_date_adhesion, '%Y-%m-%d') AS empr_date_adhesion,
              DATE_FORMAT(u.empr_date_expiration, '%Y-%m-%d') AS empr_date_expiration,
              COALESCE(s.is_active, 1) AS is_active,
              (SELECT eg.groupe_id FROM empr_groupe eg WHERE eg.empr_id = u.id_empr LIMIT 1) AS group_id
       FROM empr u
       LEFT JOIN app_user_state s ON s.id_empr = u.id_empr
       WHERE u.id_empr = ?`,
      [userId]
    )
    
    if ((rows as RowDataPacket[]).length === 0) {
      return null
    }
    
    const row = (rows as RowDataPacket[])[0]
    return {
      id_empr: row.id_empr,
      empr_nom: row.empr_nom,
      empr_prenom: row.empr_prenom,
      empr_cb: row.empr_cb,
      empr_mail: row.empr_mail,
      empr_tel1: row.empr_tel1,
      is_active: row.is_active === 1,
      empr_sexe: row.empr_sexe,
      empr_year: row.empr_year,
      empr_ville: row.empr_ville,
      empr_date_adhesion: row.empr_date_adhesion,
      empr_date_expiration: row.empr_date_expiration,
      empr_categ: row.empr_categ,
      groupId: row.group_id || undefined
    }
  },

  async searchUsers(query: string): Promise<User[]> {
    const conn = await getDbConnection()
    const searchQuery = `%${query}%`
    
    const [rows] = await conn.query(
      `SELECT id_empr, empr_nom, empr_prenom, empr_cb, empr_mail, empr_tel1,
              (SELECT GROUP_CONCAT(g.libelle_groupe SEPARATOR ', ')
               FROM empr_groupe eg
               JOIN groupe g ON g.id_groupe = eg.groupe_id
               WHERE eg.empr_id = id_empr) AS user_groups
       FROM empr
       WHERE empr_nom LIKE ? OR empr_prenom LIKE ?
       ORDER BY empr_nom, empr_prenom`,
      [searchQuery, searchQuery]
    )
    
    return (rows as RowDataPacket[]).map(row => ({
      id_empr: row.id_empr,
      empr_nom: row.empr_nom,
      empr_prenom: row.empr_prenom,
      empr_cb: row.empr_cb,
      empr_mail: row.empr_mail,
      empr_tel1: row.empr_tel1,
      user_groups: row.user_groups || ''
    }))
  },

  async getUserCategories(): Promise<{ id_categ_empr: number; libelle: string }[]> {
    const conn = await getDbConnection()
    const [rows] = await conn.query(
      `SELECT id_categ_empr, libelle FROM empr_categ ORDER BY libelle`
    )
    return (rows as RowDataPacket[]).map(row => ({
      id_categ_empr: row.id_categ_empr,
      libelle: row.libelle
    }))
  },

  async getNextBarcode(): Promise<string> {
    const conn = await getDbConnection()
    const [rows] = await conn.query(
      `SELECT empr_cb FROM empr 
       WHERE empr_cb REGEXP '^[0-9]+$' 
       ORDER BY CAST(empr_cb AS UNSIGNED) DESC 
       LIMIT 1`
    )
    const resultRows = rows as RowDataPacket[]
    if (resultRows.length === 0) {
      return '1000000001'
    }
    const lastBarcode = resultRows[0].empr_cb
    const lastNum = parseInt(lastBarcode, 10)
    if (isNaN(lastNum)) {
      return '1000000001'
    }
    return String(lastNum + 1).padStart(10, '0')
  }
}
