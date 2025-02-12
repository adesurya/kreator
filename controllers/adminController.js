const User = require('../models/user');
const db = require('../../config/database');
 
const adminController = {
    async dashboard(req, res) {
        try {
            const [
                [{ totalUsers }],
                [{ activeConversations }],
            ] = await Promise.all([
                db.execute('SELECT COUNT(*) as totalUsers FROM users'),
                db.execute('SELECT COUNT(*) as activeConversations FROM conversations')
            ]);

            res.render('admin/dashboard', {
                totalUsers,
                activeConversations,
                user: req.session.user
            });
        } catch (error) {
            res.status(500).send('Error loading dashboard');
        }
    },

    async listUsers(req, res) {
        try {
            const users = await User.getAllUsers();
            res.render('admin/users', { users, user: req.session.user });
        } catch (error) {
            res.status(500).send('Error loading users');
        }
    },

    async grantAccess(req, res) {
        try {
            const { userId } = req.params;
            const { menuName } = req.body;
            await db.execute(
                'INSERT INTO menu_access (user_id, menu_name) VALUES (?, ?)',
                [userId, menuName]
            );
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to grant access' });
        }
    },

    async revokeAccess(req, res) {
        try {
            const { userId } = req.params;
            const { menuName } = req.body;
            await db.execute(
                'DELETE FROM menu_access WHERE user_id = ? AND menu_name = ?',
                [userId, menuName]
            );
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to revoke access' });
        }
    }
};

module.exports = adminController;