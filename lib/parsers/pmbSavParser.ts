import { createReadStream, createWriteStream } from 'fs'
import { createInterface } from 'readline'
import { stat } from 'fs/promises'

export interface PmbSavParseResult {
  tablesProcessed: number
  inputBytes: number
  outputBytes: number
  durationMs: number
  tables: string[]
  skippedTables: string[]
  rowsImported: number
  rowsSkipped: number
}

export interface PmbSavParseOptions {
  /** Si se pasa, solo se procesan las tablas en este set. Las demas se saltan. */
  onlyTables?: Set<string>
}

function rewriteCreateTable(line: string): string {
  let out = line
  out = out.replace(/ENGINE=MyISAM/g, 'ENGINE=InnoDB')
  out = out.replace(/CHARSET=latin1/g, 'CHARSET=utf8mb4')
  out = out.replace(/COLLATE=latin1_swedish_ci/g, 'COLLATE=utf8mb4_unicode_ci')
  return out
}

interface TableSection {
  name: string
  lines: string[]
  dateColumns: Set<string>
}

const DATE_COLUMN_REGEX = /\b(date|datetime|timestamp|year|time)\b/i

function extractDateColumnsFromCreate(createSql: string): Set<string> {
  const out = new Set<string>()
  const columnRegex = /`([a-zA-Z_][a-zA-Z0-9_]*)`\s+([^,()]+?)(?=,|PRIMARY|UNIQUE|KEY|CONSTRAINT|\s*\))/gi
  let match: RegExpExecArray | null
  while ((match = columnRegex.exec(createSql)) !== null) {
    const colName = match[1]
    const colType = match[2]
    if (DATE_COLUMN_REGEX.test(colType)) {
      out.add(colName.toLowerCase())
    }
  }
  return out
}

function sanitizeInsert(line: string, dateColumns: Set<string>): string {
  let out = line
  out = out.replace(/(,|\()\s*INF\s*([,)])/g, '$1 0 $2')
  out = out.replace(/(,|\()\s*NaN\s*([,)])/g, '$1 0 $2')
  out = out.replace(/(,|\()\s*-INF\s*([,)])/g, '$1 0 $2')

  if (dateColumns.size === 0) return out

  const headerMatch = out.match(/^insert into\s+`?[a-zA-Z_][a-zA-Z0-9_]*`?\s*\(([^)]+)\)\s*values\s*\((.*)\)\s*;?\s*$/i)
  if (!headerMatch) return out

  const headers = headerMatch[1].split(',').map(h => h.trim().replace(/`/g, '').toLowerCase())
  const valuesStr = headerMatch[2]
  const values = splitValues(valuesStr)
  if (values.length !== headers.length) return out

  let changed = false
  for (let i = 0; i < headers.length; i++) {
    if (dateColumns.has(headers[i]) && values[i].trim() === "''") {
      values[i] = 'NULL'
      changed = true
    }
  }

  if (!changed) return out
  return out.replace(valuesStr, values.join(', '))
}

function splitValues(s: string): string[] {
  const out: string[] = []
  let buf = ''
  let inString = false
  let escape = false
  let parens = 0
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (escape) {
      buf += ch
      escape = false
      continue
    }
    if (ch === '\\' && inString) {
      buf += ch
      escape = true
      continue
    }
    if (ch === '"') {
      buf += ch
      inString = !inString
      continue
    }
    if (!inString && ch === '(') {
      parens++
      buf += ch
      continue
    }
    if (!inString && ch === ')') {
      parens--
      buf += ch
      continue
    }
    if (!inString && parens === 0 && ch === ',') {
      out.push(buf.trim())
      buf = ''
      continue
    }
    buf += ch
  }
  if (buf.trim() !== '') out.push(buf.trim())
  return out
}

const TABLE_ORDER = [
  'authors',
  'notices',
  'collections',
  'publishers',
  'series',
  'exemplaires',
  'responsability',
  'empr',
  'pret'
]

function orderKey(name: string, position: number): number {
  const idx = TABLE_ORDER.indexOf(name)
  return idx === -1 ? position + 1000 : idx
}

export async function parsePmbSav(
  inputPath: string,
  outputPath: string,
  options: PmbSavParseOptions = {}
): Promise<PmbSavParseResult> {
  const start = Date.now()
  const inputStat = await stat(inputPath)
  const inputBytes = inputStat.size

  const readStream = createReadStream(inputPath, { encoding: 'latin1' })
  const writeStream = createWriteStream(outputPath, { encoding: 'utf8' })

  writeStream.write('SET NAMES utf8mb4;\n')
  writeStream.write('SET FOREIGN_KEY_CHECKS=0;\n')
  writeStream.write('SET SESSION sql_mode=\'\';\n')

  const rl = createInterface({ input: readStream, crlfDelay: Infinity })

  const sections = new Map<string, TableSection>()
  const order: string[] = []
  let inDataSection = false
  let currentSection: TableSection | null = null
  const onlyTables = options.onlyTables
  const skippedTables: string[] = []

  for await (const rawLine of rl) {
    const line = rawLine.replace(/\r$/, '')

    if (!inDataSection) {
      if (line.trim() === '#data-section') {
        inDataSection = true
      }
      continue
    }

    if (line.startsWith('#') && !line.startsWith('#Compress')) {
      const tableName = line.slice(1).trim()
      if (tableName && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        const keep = !onlyTables || onlyTables.has(tableName)
        if (keep) {
          if (!sections.has(tableName)) {
            sections.set(tableName, { name: tableName, lines: [], dateColumns: new Set() })
            order.push(tableName)
          }
          currentSection = sections.get(tableName)!
        } else {
          currentSection = null
          if (!skippedTables.includes(tableName)) {
            skippedTables.push(tableName)
          }
        }
      }
      continue
    }

    if (!currentSection) continue
    currentSection.lines.push(line)
  }

  const tables = order.slice()
  const tablesProcessed = tables.length
  const sortedNames = [...order].sort((a, b) => orderKey(a, 0) - orderKey(b, 0))

  for (const tableName of sortedNames) {
    const section = sections.get(tableName)!
    for (const line of section.lines) {
      if (line.startsWith('CREATE TABLE')) {
        section.dateColumns = extractDateColumnsFromCreate(line)
        break
      }
    }
  }

  let rowsImported = 0
  let rowsSkipped = 0

  const writeLn = (s: string): void => {
    writeStream.write(s + '\n')
  }

  for (const tableName of sortedNames) {
    const section = sections.get(tableName)!
    writeLn(`\n-- ${tableName}`)
    for (const line of section.lines) {
      if (line.startsWith('CREATE TABLE')) {
        writeLn(rewriteCreateTable(line))
        continue
      }
      if (/^drop table/i.test(line)) {
        writeLn(line.trim())
        if (!line.trim().endsWith(';')) {
          writeStream.write(';')
        }
        writeStream.write('\n')
        continue
      }
      if (/^insert into/i.test(line)) {
        const before = line
        const cleaned = sanitizeInsert(line, section.dateColumns)
        writeLn(cleaned)
        if (cleaned !== before) {
          if (/,?\s*'?'?\s*\)\s*;?\s*$/i.test(cleaned)) {
            rowsImported++
          } else {
            rowsSkipped++
          }
        } else {
          rowsImported++
        }
        continue
      }
      if (line.trim() === '') {
        continue
      }
      writeLn(line)
    }
  }

  writeLn('\nSET FOREIGN_KEY_CHECKS=1;')

  await new Promise<void>((resolve, reject) => {
    writeStream.end((err: Error | null | undefined) => {
      if (err) reject(err)
      else resolve()
    })
  })

  const outputStat = await stat(outputPath)
  return {
    tablesProcessed,
    inputBytes,
    outputBytes: outputStat.size,
    durationMs: Date.now() - start,
    tables,
    skippedTables,
    rowsImported,
    rowsSkipped
  }
}

export async function detectPmbSavFormat(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const stream = createReadStream(filePath, { encoding: 'utf8', start: 0, end: 1023 })
    let data = ''
    stream.on('data', (chunk) => {
      data += chunk
      stream.destroy()
    })
    stream.on('end', () => resolve(data.replace(/\r\n?|\n/, '').startsWith('#Name')))
    stream.on('close', () => resolve(data.replace(/\r\n?|\n/, '').startsWith('#Name')))
    stream.on('error', () => resolve(false))
  })
}
