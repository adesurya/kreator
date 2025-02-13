// controllers/dashboardController.js
const db = require('../config/database');

const dashboardController = {
    renderDashboard: async (req, res) => {
        try {
            // Get user stats
            const [userStats] = await Promise.all([
                // Get content count
                db.execute(
                    'SELECT COUNT(*) as contentCount FROM ide_conversations WHERE user_id = ?',
                    [req.session.userId]
                ),
                // Get images count
                db.execute(
                    'SELECT COUNT(*) as imageCount FROM image_generations WHERE user_id = ?',
                    [req.session.userId]
                ),
                // Get documents count
                db.execute(
                    'SELECT COUNT(*) as docCount FROM document_resumes WHERE user_id = ?',
                    [req.session.userId]
                )
            ]);

            // Get recent activity
            const [recentActivity] = await db.execute(`
                SELECT 
                    'content' as type,
                    summary as description,
                    created_at
                FROM ide_conversations 
                WHERE user_id = ?
                UNION ALL
                SELECT 
                    'image' as type,
                    prompt as description,
                    created_at
                FROM image_generations 
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 5
            `, [req.session.userId, req.session.userId]);

            // Render dashboard with data
            res.render('dashboard/index', {
                user: req.session.user,
                stats: {
                    contentCount: userStats[0].contentCount,
                    imageCount: userStats[0].imageCount,
                    docCount: userStats[0].docCount
                },
                recentActivity,
                style: '',
                script: ''
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).render('error', {
                error: 'Failed to load dashboard',
                style: '',
                script: ''
            });
        }
    }
};

module.exports = dashboardController;