// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAdmin } = require('../middleware/auth');

// Definisikan adminController dengan fungsi dashboard
const adminController = {
    dashboard: async (req, res) => {
        try {
            // Get total users
            const [userRows] = await db.execute('SELECT COUNT(*) as total FROM users');
            const totalUsers = userRows[0].total;

            // Get total active conversations
            const [convRows] = await db.execute('SELECT COUNT(*) as total FROM conversations');
            const activeConversations = convRows[0].total;

            console.log('Dashboard stats:', { totalUsers, activeConversations });

            res.render('admin/dashboard', { 
                user: req.session.user,
                totalUsers,
                activeConversations,
                error: null
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.render('admin/dashboard', {
                error: 'Failed to load dashboard',
                user: req.session.user
            });
        }
    }
};

// Route untuk dashboard
router.get('/dashboard', isAdmin, adminController.dashboard);

module.exports = router;