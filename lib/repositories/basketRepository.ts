import { getDbConnection } from '../db'
import { RowDataPacket } from 'mysql2/promise'

export interface BasketItem {
  id: number
  basket_name: string
  expl_id: number
  expl_cb: string
  expl_cote: string
  tit1: string
  added_at: Date
}

let basketInitialized = false

async function ensureBasketTable() {
  if (basketInitialized) return

  const conn = await getDbConnection()
  await conn.query(`
    CREATE TABLE IF NOT EXISTS app_basket_items (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      basket_name VARCHAR(64) NOT NULL,
      expl_id INT UNSIGNED NOT NULL,
      added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY idx_basket_expl (basket_name, expl_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)

  basketInitialized = true
}

export const basketRepository = {
  async addToBasket(basketName: string, explId: number): Promise<void> {
    await ensureBasketTable()
    const conn = await getDbConnection()
    await conn.query(
      `INSERT IGNORE INTO app_basket_items (basket_name, expl_id) VALUES (?, ?)`,
      [basketName, explId]
    )
  },

  async getBasketItems(basketName: string): Promise<BasketItem[]> {
    await ensureBasketTable()
    const conn = await getDbConnection()
    const [rows] = await conn.query(
      `SELECT abi.id, abi.basket_name, abi.expl_id, abi.added_at,
              e.expl_cb, e.expl_cote, n.tit1
       FROM app_basket_items abi
       JOIN exemplaires e ON e.expl_id = abi.expl_id
       JOIN notices n ON n.notice_id = e.expl_notice
       WHERE abi.basket_name = ?
       ORDER BY abi.added_at DESC`,
      [basketName]
    )

    return (rows as RowDataPacket[]).map(row => ({
      id: row.id,
      basket_name: row.basket_name,
      expl_id: row.expl_id,
      expl_cb: row.expl_cb,
      expl_cote: row.expl_cote,
      tit1: row.tit1,
      added_at: row.added_at
    }))
  },

  async removeFromBasket(basketName: string, explId: number): Promise<void> {
    await ensureBasketTable()
    const conn = await getDbConnection()
    await conn.query(
      `DELETE FROM app_basket_items WHERE basket_name = ? AND expl_id = ?`,
      [basketName, explId]
    )
  },

  async clearBasket(basketName: string): Promise<void> {
    await ensureBasketTable()
    const conn = await getDbConnection()
    await conn.query(
      `DELETE FROM app_basket_items WHERE basket_name = ?`,
      [basketName]
    )
  }
}
