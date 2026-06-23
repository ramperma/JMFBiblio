import { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { hashPassword } from '../auth'
import { getDbConnection } from '../db'

export interface AppUser {
  id: number
  username: string
  role: 'admin' | 'staff'
  created_at: string
}

export interface AppSetting {
  key_name: string
  key_value: string
  description: string
}

let initialized = false

async function ensureConfigTables() {
  if (initialized) {
    return
  }

  const conn = await getDbConnection()

  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key_name VARCHAR(100) NOT NULL,
      key_value VARCHAR(255) NOT NULL,
      description VARCHAR(255) NOT NULL DEFAULT '',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (key_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  const [usersCountRows] = await conn.query('SELECT COUNT(*) AS total FROM app_users')
  const usersCount = (usersCountRows as RowDataPacket[])[0].total as number

  if (usersCount === 0) {
    const defaultAdminUser = process.env.APP_ADMIN_USER || 'admin'
    const defaultAdminPass = process.env.APP_ADMIN_PASSWORD || 'admin123'

    await conn.query(
      'INSERT INTO app_users (username, password_hash, role) VALUES (?, ?, ?)',
      [defaultAdminUser, hashPassword(defaultAdminPass), 'admin']
    )
  }

  const defaultSettings: AppSetting[] = [
    {
      key_name: 'max_loan_days',
      key_value: '14',
      description: 'Dias maximos de prestamo'
    },
    {
      key_name: 'max_renewals',
      key_value: '2',
      description: 'Numero maximo de renovaciones'
    },
    {
      key_name: 'fine_per_day',
      key_value: '0.50',
      description: 'Multa por dia de retraso'
    },
    {
      key_name: 'allow_weekend_loans',
      key_value: 'true',
      description: 'Permitir prestamos durante fin de semana'
    }
  ]

  for (const setting of defaultSettings) {
    await conn.query(
      `INSERT IGNORE INTO app_settings (key_name, key_value, description)
       VALUES (?, ?, ?)`,
      [setting.key_name, setting.key_value, setting.description]
    )
  }

  initialized = true
}

export const configRepository = {
  async ensureTables() {
    await ensureConfigTables()
  },

  async getLoginUser(username: string) {
    await ensureConfigTables()
    const conn = await getDbConnection()
    const [rows] = await conn.query(
      `SELECT id, username, password_hash, role
       FROM app_users
       WHERE username = ?`,
      [username]
    )

    if ((rows as RowDataPacket[]).length === 0) {
      return null
    }

    const row = (rows as RowDataPacket[])[0]
    return {
      id: row.id as number,
      username: row.username as string,
      password_hash: row.password_hash as string,
      role: row.role as 'admin' | 'staff'
    }
  },

  async getSettings() {
    await ensureConfigTables()
    const conn = await getDbConnection()

    const [rows] = await conn.query(
      `SELECT key_name, key_value, description
       FROM app_settings
       ORDER BY key_name`
    )

    return (rows as RowDataPacket[]).map(row => ({
      key_name: row.key_name as string,
      key_value: row.key_value as string,
      description: row.description as string
    }))
  },

  async updateSettings(settings: Array<{ key_name: string; key_value: string }>) {
    await ensureConfigTables()
    const conn = await getDbConnection()

    for (const setting of settings) {
      await conn.query(
        `UPDATE app_settings
         SET key_value = ?
         WHERE key_name = ?`,
        [setting.key_value, setting.key_name]
      )
    }
  },

  async getUsersPaginated(page: number, pageSize: number) {
    await ensureConfigTables()
    const conn = await getDbConnection()
    const offset = (page - 1) * pageSize

    const [countRows] = await conn.query('SELECT COUNT(*) AS total FROM app_users')
    const total = (countRows as RowDataPacket[])[0].total as number

    const [rows] = await conn.query(
      `SELECT id, username, role, created_at
       FROM app_users
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    )

    const data = (rows as RowDataPacket[]).map(row => ({
      id: row.id as number,
      username: row.username as string,
      role: row.role as 'admin' | 'staff',
      created_at: row.created_at as string
    }))

    return {
      data,
      total
    }
  },

  async createUser(input: { username: string; password: string; role: 'admin' | 'staff' }) {
    await ensureConfigTables()
    const conn = await getDbConnection()

    const [result] = await conn.query(
      `INSERT INTO app_users (username, password_hash, role)
       VALUES (?, ?, ?)`,
      [input.username, hashPassword(input.password), input.role]
    )

    return (result as ResultSetHeader).insertId
  },

  async updateUser(
    id: number,
    input: { username?: string; password?: string; role?: 'admin' | 'staff' }
  ) {
    await ensureConfigTables()
    const conn = await getDbConnection()

    if (input.username) {
      await conn.query('UPDATE app_users SET username = ? WHERE id = ?', [input.username, id])
    }

    if (input.role) {
      await conn.query('UPDATE app_users SET role = ? WHERE id = ?', [input.role, id])
    }

    if (input.password) {
      await conn.query('UPDATE app_users SET password_hash = ? WHERE id = ?', [
        hashPassword(input.password),
        id
      ])
    }
  },

  async deleteUser(id: number) {
    await ensureConfigTables()
    const conn = await getDbConnection()
    await conn.query('DELETE FROM app_users WHERE id = ?', [id])
  }
}
