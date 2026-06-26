import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function getDbPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '3306'),
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'pmb',
      enableKeepAlive: true,
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0
    })
  }
  return pool
}

// Backward compat: Pool has the same .query() interface as Connection
export async function getDbConnection(): Promise<mysql.Pool> {
  return getDbPool()
}

export async function closeDbConnection(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
