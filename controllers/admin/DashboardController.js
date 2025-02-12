// controllers/admin/DashboardController.js
const db = require('../../config/database');

const dashboardController = {
    index: async (req, res) => {
        try {
            // Get key statistics
            const [userStats] = await db.execute(
                'SELECT COUNT(*) as total_users FROM users WHERE role = "user"'
            );

            // Get active subscriptions count with error handling
            const [activeSubscriptions] = await db.execute(`
                SELECT COUNT(*) as total_active 
                FROM user_subscriptions 
                WHERE end_date > CURRENT_TIMESTAMP AND is_active = 1
            `).catch(() => [[{ total_active: 0 }]]);

            // Get transactions with error handling
            const [transactions] = await db.execute(`
                SELECT COUNT(*) as total_transactions,
                       SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END) as total_revenue
                FROM transactions
            `).catch(() => [[{ total_transactions: 0, total_revenue: 0 }]]);

            // Get active plans count with error handling
            const [plans] = await db.execute(
                'SELECT COUNT(*) as total_plans FROM plans WHERE is_active = 1'
            ).catch(() => [[{ total_plans: 0 }]]);

            // Get recent transactions with error handling
            const [recentTransactions] = await db.execute(`
                SELECT t.*, u.username, p.name as plan_name
                FROM transactions t
                LEFT JOIN users u ON t.user_id = u.id
                LEFT JOIN plans p ON t.plan_id = p.id
                ORDER BY t.created_at DESC
                LIMIT 5
            `).catch(() => [[]]);

            res.render('admin/dashboard', {
                user: req.session.user,
                stats: {
                    totalUsers: userStats[0].total_users || 0,
                    activeSubscriptions: activeSubscriptions[0].total_active || 0,
                    totalTransactions: transactions[0].total_transactions || 0,
                    totalRevenue: transactions[0].total_revenue || 0,
                    totalPlans: plans[0].total_plans || 0
                },
                recentTransactions: recentTransactions || []
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).render('error', { 
                error: 'Failed to load dashboard',
                user: req.session.user
            });
        }
    }
};

module.exports = dashboardController;