// routes/admin.js atau controllers/adminController.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs'); // Tambahkan ini

const { isAdmin } = require('../middleware/auth');

const adminRoutes = {
    dashboard: async (req, res) => {
        try {
            // Get total users
            const [userRows] = await db.execute('SELECT COUNT(*) as total FROM users');
            const totalUsers = userRows[0].total;

            // Get total active conversations
            const [convRows] = await db.execute('SELECT COUNT(*) as total FROM conversations');
            const activeConversations = convRows[0].total;

            // Get total messages (jika ada tabel messages)
            const totalMessages = 0; // Sesuaikan dengan struktur database Anda

            console.log('Dashboard stats:', { totalUsers, activeConversations, totalMessages });

            res.render('admin/dashboard', { 
                user: req.session.user,
                style: '',
                script: '',
                totalUsers,
                activeConversations,
                totalMessages
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).render('error', {
                error: 'Failed to load dashboard',
                user: req.session.user,
                style: '',
                script: ''
            });
        }
    },
    users: async (req, res) => {
        try {
            // Fetch users with their menu access
            const [users] = await db.execute(`
                SELECT u.*, 
                       GROUP_CONCAT(ma.menu_name) as menu_access
                FROM users u
                LEFT JOIN menu_access ma ON u.id = ma.user_id
                GROUP BY u.id
            `);

            // Format users data
            const formattedUsers = users.map(user => ({
                ...user,
                menuAccess: user.menu_access ? user.menu_access.split(',') : []
            }));

            res.render('admin/users', {
                users: formattedUsers,
                totalUsers: users.length
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).render('error', {
                error: 'Failed to load users'
            });
        }
    },

    // Add user
    addUser: async (req, res) => {
        try {
            const { username, email, password, role } = req.body;
            
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // Insert user
            const [result] = await db.execute(
                'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                [username, email, hashedPassword, role || 'user']
            );
            
            res.json({
                success: true,
                message: 'User added successfully',
                userId: result.insertId
            });
        } catch (error) {
            console.error('Error adding user:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to add user' 
            });
        }
    },

    // Delete user
    deleteUser: async (req, res) => {
        try {
            const { userId } = req.params;
            await db.execute('DELETE FROM users WHERE id = ?', [userId]);
            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    },

    settings: async (req, res) => {
        try {
            // Fetch current settings from database
            const [settings] = await db.execute('SELECT * FROM app_settings');
            
            res.render('admin/settings', {
                settings: settings[0] || {},
                apiSettings: {
                    epsillaApiKey: process.env.EPSILLA_API_KEY,
                    epsillaNamespace: process.env.EPSILLA_NAMESPACE,
                    epsillaAppId: process.env.EPSILLA_APP_ID
                }
            });
        } catch (error) {
            console.error('Error loading settings:', error);
            res.status(500).render('error', { error: 'Failed to load settings' });
        }
    },

    updateSettings: async (req, res) => {
        try {
            const { setting_name, setting_value } = req.body;
            await db.execute(
                'INSERT INTO app_settings (setting_name, setting_value) VALUES (?, ?) ' +
                'ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
                [setting_name, setting_value]
            );
            res.json({ success: true });
        } catch (error) {
            console.error('Error updating settings:', error);
            res.status(500).json({ error: 'Failed to update settings' });
        }
    }
};

router.get('/dashboard', isAdmin, adminRoutes.dashboard);
router.get('/users', isAdmin, adminRoutes.users);
router.post('/users/add', isAdmin, adminRoutes.addUser);
router.delete('/users/:userId', isAdmin, adminRoutes.deleteUser);
router.get('/settings', isAdmin, adminRoutes.settings);
router.post('/settings/update', isAdmin, adminRoutes.updateSettings);

module.exports = router;