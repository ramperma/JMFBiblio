import { detectPmbSavFormat } from './pmbSavParser'

export type BackupFormat = 'pmb-sav' | 'mysqldump' | 'unknown'

export async function detectFormat(filePath: string): Promise<BackupFormat> {
  if (await detectPmbSavFormat(filePath)) {
    return 'pmb-sav'
  }
  return 'mysqldump'
}

export { parsePmbSav, detectPmbSavFormat } from './pmbSavParser'
export type { PmbSavParseResult } from './pmbSavParser'
