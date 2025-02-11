const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async create({ username, email, password }) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword]
        );
        return result.insertId;
    }

    static async findByEmail(email) {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    static async verifyPassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    static async getAllUsers() {
        const [rows] = await db.execute('SELECT id, username, email, role FROM users');
        return rows;
    }

    static async updateRole(userId, role) {
        await db.execute(
            'UPDATE users SET role = ? WHERE id = ?',
            [role, userId]
        );
    }

    tatic async isAdmin(userId) {
        try {
            const [rows] = await db.execute(
                'SELECT role FROM users WHERE id = ?',
                [userId]
            );
            return rows.length > 0 && rows[0].role === 'admin';
        } catch (error) {
            console.error('Error checking admin status:', error);
            return false;
        }
    }

    static async getAdminUsers() {
        try {
            const [rows] = await db.execute(
                'SELECT id, username, email FROM users WHERE role = ?',
                ['admin']
            );
            return rows;
        } catch (error) {
            console.error('Error getting admin users:', error);
            return [];
        }
    }
}

module.exports = User;