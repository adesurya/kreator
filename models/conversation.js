const db = require('../config/database');

class Conversation {
    static async create(userId, summary) {
        const [result] = await db.execute(
            'INSERT INTO conversations (id, user_id, summary) VALUES (?, ?, ?)',
            [conversationId, userId, summary]
        );
        return result.insertId;
    }

    static async getByUser(userId) {
        const [rows] = await db.execute(
            'SELECT * FROM conversations WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    }

    static async delete(conversationId, userId) {
        await db.execute(
            'DELETE FROM conversations WHERE id = ? AND user_id = ?',
            [conversationId, userId]
        );
    }
}

module.exports = Conversation;