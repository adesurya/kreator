const db = require('../config/database');

class MenuAccess {
    static async grantAccess(userId, menuName) {
        await db.execute(
            'INSERT INTO menu_access (user_id, menu_name) VALUES (?, ?)',
            [userId, menuName]
        );
    }

    static async revokeAccess(userId, menuName) {
        await db.execute(
            'DELETE FROM menu_access WHERE user_id = ? AND menu_name = ?',
            [userId, menuName]
        );
    }

    static async getUserAccess(userId) {
        const [rows] = await db.execute(
            'SELECT menu_name FROM menu_access WHERE user_id = ?',
            [userId]
        );
        return rows.map(row => row.menu_name);
    }
}

module.exports = MenuAccess;