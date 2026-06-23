import { RowDataPacket } from 'mysql2/promise'
import { getDbConnection } from '../db'

const RATE_LIMIT_WINDOW_MINUTES = 15
const RATE_LIMIT_MAX_FAILURES = 5
const RETENTION_HOURS = 24

let initialized = false

async function ensureLoginAttemptsTable() {
  if (initialized) {
    return
  }

  const conn = await getDbConnection()

  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_login_attempts (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      ip VARCHAR(64) NOT NULL,
      success TINYINT(1) NOT NULL,
      attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_ip_time (ip, attempted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  await conn.query(
    `DELETE FROM app_login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [RETENTION_HOURS]
  )

  initialized = true
}

export const authRepository = {
  async getRecentFailures(ip: string, windowMinutes = RATE_LIMIT_WINDOW_MINUTES) {
    await ensureLoginAttemptsTable()
    const conn = await getDbConnection()

    const [rows] = await conn.query(
      `SELECT COUNT(*) AS total
       FROM app_login_attempts
       WHERE ip = ?
         AND success = 0
         AND attempted_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [ip, windowMinutes]
    )

    return (rows as RowDataPacket[])[0].total as number
  },

  async recordAttempt(ip: string, success: boolean) {
    await ensureLoginAttemptsTable()
    const conn = await getDbConnection()

    await conn.query(
      'INSERT INTO app_login_attempts (ip, success) VALUES (?, ?)',
      [ip, success ? 1 : 0]
    )
  },

  async clearAttempts(ip: string) {
    await ensureLoginAttemptsTable()
    const conn = await getDbConnection()

    await conn.query('DELETE FROM app_login_attempts WHERE ip = ?', [ip])
  }
}

export const RATE_LIMIT_CONFIG = {
  windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
  maxFailures: RATE_LIMIT_MAX_FAILURES
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) {
      return first
    }
  }

  const real = request.headers.get('x-real-ip')
  if (real) {
    return real.trim()
  }

  return 'unknown'
}