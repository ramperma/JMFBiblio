import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync, mkdirSync, copyFileSync, unlinkSync } from 'fs'
import { readdir, stat, unlink } from 'fs/promises'
import path from 'path'
import { tmpdir } from 'os'
import { randomBytes } from 'crypto'
import { parsePmbSav, detectFormat } from '@/lib/parsers'
import { closeDbConnection } from '@/lib/db'

const exec = promisify(execFile)

const BACKUP_DIR = process.env.PMB_BACKUP_DIR || path.join(process.cwd(), 'backups')
const MYSQL_HOST = process.env.DATABASE_HOST || 'localhost'
const MYSQL_PORT = process.env.DATABASE_PORT || '3306'
const MYSQL_USER = process.env.DATABASE_USER || 'root'
const MYSQL_PASSWORD = process.env.DATABASE_PASSWORD || ''
const MYSQL_DB = process.env.DATABASE_NAME || 'pmb'

/** Tablas que la app lee. El parser solo procesa estas del SAV. */
export const APP_TABLES = new Set([
  'notices',
  'exemplaires',
  'empr',
  'pret',
  'authors',
  'responsability',
  'groupe',
  'empr_groupe'
])

export interface BackupInfo {
  name: string
  sizeBytes: number
  createdAt: string
}

export interface ImportResult {
  format: 'pmb-sav' | 'mysqldump'
  tablesImported: string[]
  tablesSkipped: string[]
  inputBytes: number
  parsedBytes?: number
  durationMs: number
  warnings: string[]
}

function mysqldumpArgs(extra: string[] = []): string[] {
  return [
    '-h', MYSQL_HOST,
    '-P', MYSQL_PORT,
    '-u', MYSQL_USER,
    `--password=${MYSQL_PASSWORD}`,
    '--default-character-set=utf8mb4',
    '--single-transaction',
    '--routines',
    '--triggers',
    '--events',
    '--no-tablespaces',
    ...extra
  ]
}

function mysqlImportArgs(extra: string[] = []): string[] {
  return [
    '-h', MYSQL_HOST,
    '-P', MYSQL_PORT,
    '-u', MYSQL_USER,
    `--password=${MYSQL_PASSWORD}`,
    '--default-character-set=utf8mb4',
    '--force',
    ...extra
  ]
}

function ensureBackupDir(): void {
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

function genName(label?: string): string {
  const d = new Date()
  const stamp = d.toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const safe = (label || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)
  return `backup-${stamp}${safe ? '-' + safe : ''}.sql.gz`
}

export async function createBackup(label?: string): Promise<BackupInfo> {
  ensureBackupDir()
  const filename = genName(label)
  const filepath = path.join(BACKUP_DIR, filename)

  const tmpFile = path.join(tmpdir(), `dump-${randomBytes(6).toString('hex')}.sql`)
  try {
    const { stdout } = await exec('mysqldump', mysqldumpArgs([MYSQL_DB]), { maxBuffer: 200 * 1024 * 1024 })
    const { writeFile } = await import('fs/promises')
    await writeFile(tmpFile, stdout)
  } catch (err) {
    throw new Error(`mysqldump fallo: ${(err as Error).message}`)
  }

  await new Promise<void>((resolve, reject) => {
    const gzip = require('child_process').spawn('gzip', ['-f', tmpFile])
    gzip.on('exit', (code: number | null) => {
      if (code === 0) resolve()
      else reject(new Error(`gzip fallo con codigo ${code}`))
    })
    gzip.on('error', reject)
  })

  const gzFile = tmpFile + '.gz'
  copyFileSync(gzFile, filepath)
  unlinkSync(gzFile)
  const st = await stat(filepath)
  return {
    name: filename,
    sizeBytes: st.size,
    createdAt: new Date().toISOString()
  }
}

export async function listBackups(): Promise<BackupInfo[]> {
  ensureBackupDir()
  const files = await readdir(BACKUP_DIR)
  const sqlGz = files.filter(f => f.endsWith('.sql.gz') || f.endsWith('.sav') || f.endsWith('.sql'))
  const out: BackupInfo[] = []
  for (const name of sqlGz) {
    const full = path.join(BACKUP_DIR, name)
    const st = await stat(full)
    out.push({
      name,
      sizeBytes: st.size,
      createdAt: st.mtime.toISOString()
    })
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function deleteBackup(name: string): Promise<void> {
  ensureBackupDir()
  const safe = path.basename(name)
  const full = path.join(BACKUP_DIR, safe)
  if (!full.startsWith(BACKUP_DIR + path.sep) && full !== BACKUP_DIR) {
    throw new Error('Path invalido')
  }
  if (!existsSync(full)) {
    throw new Error('Backup no encontrado')
  }
  await unlink(full)
}

async function dropTablesViaSql(tables: string[]): Promise<void> {
  if (tables.length === 0) return
  const { getDbConnection, closeDbConnection } = await import('@/lib/db')
  const conn = await getDbConnection()
  await conn.query('SET FOREIGN_KEY_CHECKS=0')
  for (const t of tables) {
    await conn.query(`DROP TABLE IF EXISTS \`${t}\``)
  }
  await conn.query('SET FOREIGN_KEY_CHECKS=1')
  await closeDbConnection()
}

export async function importFromFile(
  sourcePath: string,
  options: { onlyTables?: Set<string> } = {}
): Promise<ImportResult> {
  const start = Date.now()
  const fmt = await detectFormat(sourcePath)
  const inStat = await stat(sourcePath)
  const inputBytes = inStat.size

  if (fmt === 'pmb-sav') {
    const tmpParsed = path.join(tmpdir(), `parsed-${randomBytes(6).toString('hex')}.sql`)
    const parseResult = await parsePmbSav(sourcePath, tmpParsed, {
      onlyTables: options.onlyTables || APP_TABLES
    })

    await dropTablesViaSql(parseResult.tables)

    const warnings: string[] = []
    warnings.push(...parseResult.warnings)
    const result = await runMysqlImport(tmpParsed, true)
    warnings.push(...result.warnings)

    await unlink(tmpParsed).catch(() => undefined)
    await closeDbConnection()

    return {
      format: 'pmb-sav',
      tablesImported: parseResult.tables,
      tablesSkipped: parseResult.skippedTables,
      inputBytes,
      parsedBytes: parseResult.outputBytes,
      durationMs: Date.now() - start,
      warnings
    }
  }

  const result = await runMysqlImport(sourcePath, true)
  await closeDbConnection()
  return {
    format: 'mysqldump',
    tablesImported: [],
    tablesSkipped: [],
    inputBytes,
    durationMs: Date.now() - start,
    warnings: result.warnings
  }
}

async function runMysqlImport(
  sqlPath: string,
  continueOnError: boolean
): Promise<{ warnings: string[] }> {
  const warnings: string[] = []
  const args = continueOnError ? mysqlImportArgs(['--force', MYSQL_DB]) : mysqlImportArgs([MYSQL_DB])
  return new Promise((resolve) => {
    const proc = require('child_process').spawn('mysql', args)
    const fs = require('fs')
    const readStream = fs.createReadStream(sqlPath)
    let stderrBuf = ''
    let stderrTruncated = false

    proc.stderr.on('data', (chunk: Buffer) => {
      if (stderrBuf.length < 20000) {
        stderrBuf += chunk.toString()
      } else if (!stderrTruncated) {
        stderrTruncated = true
      }
    })

    proc.on('close', (code: number | null) => {
      if (code !== 0 && !continueOnError) {
        resolve({ warnings: [`mysql import fallo con codigo ${code}: ${stderrBuf.slice(0, 500)}`] })
        return
      }
      const lines = stderrBuf.split('\n').filter((l: string) => l.trim() && !l.includes('Warning'))
      resolve({ warnings: lines.slice(0, 30) })
    })

    proc.on('error', (err: Error) => {
      resolve({ warnings: [`Error al ejecutar mysql: ${err.message}`] })
    })

    readStream.pipe(proc.stdin)
    readStream.on('error', (err: Error) => {
      warnings.push(`Error leyendo SQL: ${err.message}`)
    })
  })
}

export async function resetDatabase(): Promise<void> {
  ensureBackupDir()
  const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const safetyBackup = path.join(BACKUP_DIR, `pre-reset-${ts}.sql.gz`)

  const dump = await exec('mysqldump', mysqldumpArgs([MYSQL_DB]), { maxBuffer: 200 * 1024 * 1024 })
  const { writeFile } = await import('fs/promises')
  const tmpFile = path.join(tmpdir(), `pre-reset-${ts}.sql`)
  await writeFile(tmpFile, dump.stdout)

  await new Promise<void>((resolve, reject) => {
    const gzip = require('child_process').spawn('gzip', ['-f', tmpFile])
    gzip.on('exit', (code: number | null) => {
      if (code === 0) resolve()
      else reject(new Error(`gzip fallo con codigo ${code}`))
    })
  })
  copyFileSync(tmpFile + '.gz', safetyBackup)
  unlinkSync(tmpFile + '.gz')
  await closeDbConnection()
  return Promise.resolve()
}

export async function dropPmbTables(): Promise<string[]> {
  const conn = await import('@/lib/db').then(m => m.getDbConnection())
  const [rows] = await conn.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = ? AND table_name NOT LIKE 'app_%'`,
    [MYSQL_DB]
  ) as any
  const tables: string[] = (rows as any[]).map(r => r.table_name || r.TABLE_NAME)

  if (tables.length === 0) return []

  await conn.query('SET FOREIGN_KEY_CHECKS=0')
  for (const t of tables) {
    await conn.query(`DROP TABLE IF EXISTS \`${t}\``)
  }
  await conn.query('SET FOREIGN_KEY_CHECKS=1')
  return tables
}

export function getBackupDir(): string {
  return BACKUP_DIR
}

export function getBackupPath(name: string): string {
  const safe = path.basename(name)
  return path.join(BACKUP_DIR, safe)
}
