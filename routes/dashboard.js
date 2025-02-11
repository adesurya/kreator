const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

const dashboardController = {
    // Render dashboard page
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
                ),
                // Get transcriptions count
                db.execute(
                    'SELECT COUNT(*) as transcriptCount FROM transcriptions WHERE user_id = ?',
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
                UNION ALL
                SELECT 
                    'document' as type,
                    original_filename as description,
                    created_at
                FROM document_resumes 
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 5
            `, [req.session.userId, req.session.userId, req.session.userId]);

            // Calculate storage used (example calculation)
            const storageUsed = {
                images: 0,
                documents: 0,
                transcriptions: 0,
                total: 0
            };

            // Calculate percentage changes (mock data for example)
            const percentageChanges = {
                content: 12,
                images: 8,
                documents: 5,
                storage: 4
            };

            // Get menu access for the user
            const [menuAccess] = await db.execute(
                'SELECT menu_name FROM menu_access WHERE user_id = ?',
                [req.session.userId]
            );

            // Render dashboard with data
            res.render('dashboard/index', {
                user: req.session.user,
                stats: {
                    contentCount: userStats[0].contentCount,
                    imageCount: userStats[0].imageCount,
                    docCount: userStats[0].docCount,
                    transcriptCount: userStats[0].transcriptCount
                },
                storageUsed,
                percentageChanges,
                recentActivity,
                menuAccess: menuAccess.map(menu => menu.menu_name),
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
    },

    // Get user stats for AJAX updates
    getStats: async (req, res) => {
        try {
            const [userStats] = await Promise.all([
                db.execute(
                    'SELECT COUNT(*) as contentCount FROM ide_conversations WHERE user_id = ?',
                    [req.session.userId]
                ),
                db.execute(
                    'SELECT COUNT(*) as imageCount FROM image_generations WHERE user_id = ?',
                    [req.session.userId]
                )
            ]);

            res.json({
                success: true,
                stats: {
                    contentCount: userStats[0].contentCount,
                    imageCount: userStats[0].imageCount
                }
            });
        } catch (error) {
            console.error('Get stats error:', error);
            res.status(500).json({ error: 'Failed to get stats' });
        }
    },

    // Get recent activity for AJAX updates
    getRecentActivity: async (req, res) => {
        try {
            const [activity] = await db.execute(`
                SELECT * FROM (
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
                ) as recent
                ORDER BY created_at DESC
            `, [req.session.userId, req.session.userId]);

            res.json({
                success: true,
                activity
            });
        } catch (error) {
            console.error('Get activity error:', error);
            res.status(500).json({ error: 'Failed to get activity' });
        }
    },

    // Get storage stats
    getStorageStats: async (req, res) => {
        try {
            // Calculate storage usage per type
            // This would need to be implemented based on your storage system
            const storageStats = {
                images: '1.2 GB',
                documents: '0.8 GB',
                transcriptions: '0.4 GB',
                total: '2.4 GB'
            };

            res.json({
                success: true,
                storageStats
            });
        } catch (error) {
            console.error('Get storage stats error:', error);
            res.status(500).json({ error: 'Failed to get storage stats' });
        }
    }
};

// Define routes
router.get('/', isAuthenticated, dashboardController.renderDashboard);
router.get('/stats', isAuthenticated, dashboardController.getStats);
router.get('/activity', isAuthenticated, dashboardController.getRecentActivity);
router.get('/storage', isAuthenticated, dashboardController.getStorageStats);

module.exports = router;