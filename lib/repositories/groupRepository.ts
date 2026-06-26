import { getDbConnection, getDbPool } from '../db'
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

export interface Group {
  id_groupe: number
  libelle_groupe: string
}

export const groupRepository = {
  async getAllGroups(): Promise<Group[]> {
    const conn = await getDbConnection()
    const [rows] = await conn.query(
      `SELECT id_groupe, libelle_groupe
       FROM groupe
       ORDER BY libelle_groupe`
    )
    return (rows as RowDataPacket[]).map(row => ({
      id_groupe: row.id_groupe,
      libelle_groupe: row.libelle_groupe
    }))
  },

  async createGroup(libelle: string): Promise<number> {
    const conn = await getDbConnection()
    const [result] = await conn.query(
      'INSERT INTO groupe (libelle_groupe) VALUES (?)',
      [libelle]
    )
    return (result as ResultSetHeader).insertId
  },

  async updateGroup(id: number, libelle: string): Promise<void> {
    const conn = await getDbConnection()
    await conn.query(
      'UPDATE groupe SET libelle_groupe = ? WHERE id_groupe = ?',
      [libelle, id]
    )
  },

  async deleteGroup(id: number): Promise<void> {
    const conn = await getDbPool().getConnection()
    try {
      await conn.beginTransaction()
      await conn.query('DELETE FROM empr_groupe WHERE groupe_id = ?', [id])
      await conn.query('DELETE FROM groupe WHERE id_groupe = ?', [id])
      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }
  },

  async addUserToGroup(userId: number, groupId: number): Promise<void> {
    const conn = await getDbConnection()
    await conn.query(
      'INSERT IGNORE INTO empr_groupe (empr_id, groupe_id) VALUES (?, ?)',
      [userId, groupId]
    )
  },

  async removeUserFromGroup(userId: number, groupId: number): Promise<void> {
    const conn = await getDbConnection()
    await conn.query(
      'DELETE FROM empr_groupe WHERE empr_id = ? AND groupe_id = ?',
      [userId, groupId]
    )
  },

  async transferGroupMembers(fromGroupId: number, toGroupId: number): Promise<void> {
    const conn = await getDbPool().getConnection()
    try {
      await conn.beginTransaction()
      await conn.query(
        'UPDATE IGNORE empr_groupe SET groupe_id = ? WHERE groupe_id = ?',
        [toGroupId, fromGroupId]
      )
      await conn.query('DELETE FROM empr_groupe WHERE groupe_id = ?', [fromGroupId])
      await conn.commit()
    } catch (e) {
      await conn.rollback()
      throw e
    } finally {
      conn.release()
    }
  }
}
