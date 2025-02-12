// routes/admin/dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../../config/database');

router.get('/', async (req, res) => {
    try {
        // Get users count
        const [userRows] = await db.execute(
            'SELECT COUNT(*) as total FROM users'
        );
        const totalUsers = userRows[0].total;

        // Get conversations count
        const [convRows] = await db.execute(
            'SELECT COUNT(*) as total FROM conversations'
        );
        const activeConversations = convRows[0].total;

        res.render('admin/dashboard', {
            user: req.session.user,
            totalUsers,
            activeConversations,
            error: null
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('admin/dashboard', {
            user: req.session.user,
            error: 'Failed to load dashboard stats'
        });
    }
});

module.exports = router;