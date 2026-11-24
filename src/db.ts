import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import type { Chat, ChatRepository } from './types.js';

export const pool: Pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

export const mysqlChatRepository: ChatRepository = {
  async findOrCreateOneToOneChat(userAId, userBId): Promise<Chat> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, user_a_id AS userAId, user_b_id AS userBId, created_at AS createdAt
       FROM chats WHERE user_a_id = ? AND user_b_id = ? LIMIT 1`,
      [userAId, userBId],
    );
    if (rows[0]) return toChat(rows[0]);

    const [reverseRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, user_a_id AS userAId, user_b_id AS userBId, created_at AS createdAt
       FROM chats WHERE user_a_id = ? AND user_b_id = ? LIMIT 1`,
      [userBId, userAId],
    );
    if (reverseRows[0]) return toChat(reverseRows[0]);

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO chats (user_a_id, user_b_id) VALUES (?, ?)',
      [userAId, userBId],
    );
    return { id: String(result.insertId), userAId, userBId, createdAt: new Date() };
  },

  async findChatById(chatId) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, user_a_id AS userAId, user_b_id AS userBId, created_at AS createdAt
       FROM chats WHERE id = ? LIMIT 1`, [chatId]);
    return rows[0] ? toChat(rows[0]) : null;
  },

  async listChatsForUser(userId) {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, user_a_id AS userAId, user_b_id AS userBId, created_at AS createdAt
       FROM chats WHERE user_a_id = ? OR user_b_id = ? ORDER BY created_at DESC`,
      [userId, userId]);
    return rows.map(toChat);
  },
};

function toChat(row: RowDataPacket): Chat {
  return { id: String(row.id), userAId: String(row.userAId), userBId: String(row.userBId), createdAt: new Date(row.createdAt) };
}
