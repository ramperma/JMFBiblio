import mysql from 'mysql2/promise'

let connection: mysql.Connection | null = null

export async function getDbConnection(): Promise<mysql.Connection> {
  if (connection) {
    try {
      await connection.ping()
      return connection
    } catch (error) {
      connection = null
    }
  }

  connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'pmb',
    enableKeepAlive: true
  })

  return connection
}

export async function closeDbConnection(): Promise<void> {
  if (connection) {
    await connection.end()
    connection = null
  }
}
