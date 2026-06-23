import { BackupInfo, ImportResult, createBackup as coreCreateBackup, listBackups as coreListBackups, deleteBackup as coreDeleteBackup, importFromFile as coreImport, resetDatabase as coreReset, dropPmbTables as coreDropPmb, getBackupPath } from '@/lib/backup'
import { readFileSync } from 'fs'

export const backupRepository = {
  async createBackup(label?: string): Promise<BackupInfo> {
    return coreCreateBackup(label)
  },

  async listBackups(): Promise<BackupInfo[]> {
    return coreListBackups()
  },

  async deleteBackup(name: string): Promise<void> {
    return coreDeleteBackup(name)
  },

  async importFromFile(sourcePath: string): Promise<ImportResult> {
    return coreImport(sourcePath)
  },

  async resetDatabase(): Promise<void> {
    await coreReset()
  },

  async dropPmbTables(): Promise<string[]> {
    return coreDropPmb()
  },

  getBackupPath,

  readBackupFile(name: string): Buffer {
    return readFileSync(getBackupPath(name))
  }
}
