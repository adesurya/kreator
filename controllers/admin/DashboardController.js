// controllers/admin/DashboardController.js
const db = require('../../config/database');

const dashboardController = {
    // Render dashboard page
    index: async (req, res) => {
        try {
            // Get key statistics
            const [userStats] = await db.execute(
                'SELECT COUNT(*) as total_users FROM users WHERE role = "user"'
            );

            const [activeSubscriptions] = await db.execute(`
                SELECT COUNT(*) as total_active 
                FROM user_subscriptions 
                WHERE end_date > CURRENT_TIMESTAMP AND is_active = 1
            `);

            const [transactions] = await db.execute(`
                SELECT COUNT(*) as total_transactions,
                       SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END) as total_revenue
                FROM transactions
            `);

            const [plans] = await db.execute(
                'SELECT COUNT(*) as total_plans FROM plans WHERE is_active = 1'
            );

            // Get recent transactions
            const [recentTransactions] = await db.execute(`
                SELECT t.*, u.username, p.name as plan_name
                FROM transactions t
                JOIN users u ON t.user_id = u.id
                JOIN plans p ON t.plan_id = p.id
                ORDER BY t.created_at DESC
                LIMIT 5
            `);

            res.render('admin/dashboard', {
                user: req.session.user,
                stats: {
                    totalUsers: userStats[0].total_users,
                    activeSubscriptions: activeSubscriptions[0].total_active,
                    totalTransactions: transactions[0].total_transactions,
                    totalRevenue: transactions[0].total_revenue || 0,
                    totalPlans: plans[0].total_plans
                },
                recentTransactions
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