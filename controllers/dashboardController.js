// controllers/dashboardController.js
const db = require('../config/database');
const defaultStats = {
    contentCount: 0,
    contentGrowth: 0,
    imageCount: 0,
    imageGrowth: 0,
    docCount: 0,
    docGrowth: 0,
    storageUsed: 0,
    recentActivity: []
};

const dashboardController = {
    renderDashboard: async (req, res) => {
        let stats = { ...defaultStats };

        try {
          
            // Get content count
            const [contentStats] = await db.execute(
                'SELECT COUNT(*) as count FROM ide_conversations WHERE user_id = ?',
                [req.session.userId]
            );

            // Get image count
            const [imageStats] = await db.execute(
                'SELECT COUNT(*) as count FROM image_generations WHERE user_id = ?',
                [req.session.userId]
            );

            // Get document count
            const [documentStats] = await db.execute(
                'SELECT COUNT(*) as count FROM document_resumes WHERE user_id = ?',
                [req.session.userId]
            );

            // Previous month for comparison
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            // Get previous month's stats
            const [prevContentStats] = await db.execute(
                'SELECT COUNT(*) as count FROM ide_conversations WHERE user_id = ? AND created_at >= ?',
                [req.session.userId, lastMonth]
            );

            const [prevImageStats] = await db.execute(
                'SELECT COUNT(*) as count FROM image_generations WHERE user_id = ? AND created_at >= ?',
                [req.session.userId, lastMonth]
            );

            const [prevDocumentStats] = await db.execute(
                'SELECT COUNT(*) as count FROM document_resumes WHERE user_id = ? AND created_at >= ?',
                [req.session.userId, lastMonth]
            );

            // Recent Activity
            const [activities] = await db.execute(`
                (SELECT 
                    'content' as type,
                    id,
                    summary as description,
                    created_at,
                    NULL as file_url
                FROM ide_conversations 
                WHERE user_id = ?)
                
                UNION ALL
                
                (SELECT 
                    'image' as type,
                    id,
                    prompt as description,
                    created_at,
                    image_url as file_url
                FROM image_generations 
                WHERE user_id = ?)
                
                UNION ALL
                
                (SELECT 
                    'document' as type,
                    id,
                    original_filename as description,
                    created_at,
                    NULL as file_url
                FROM document_resumes
                WHERE user_id = ?)
                
                ORDER BY created_at DESC
                LIMIT 10
            `, [req.session.userId, req.session.userId, req.session.userId]);

            // Calculate growth
            const calculateGrowth = (current, previous) => {
                if (previous === 0) return 0;
                return Number(((current - previous) / previous * 100).toFixed(1));
            };

            // Format time ago
            const formatTimeAgo = (date) => {
                const seconds = Math.floor((new Date() - new Date(date)) / 1000);
                
                let interval = seconds / 31536000;
                if (interval > 1) return Math.floor(interval) + " years ago";
                
                interval = seconds / 2592000;
                if (interval > 1) return Math.floor(interval) + " months ago";
                
                interval = seconds / 86400;
                if (interval > 1) return Math.floor(interval) + " days ago";
                
                interval = seconds / 3600;
                if (interval > 1) return Math.floor(interval) + " hours ago";
                
                interval = seconds / 60;
                if (interval > 1) return Math.floor(interval) + " minutes ago";
                
                return "Just now";
            };

            // Compile stats
            stats = {
                ...defaultStats,
                contentCount: contentStats[0].count || 0,
                contentGrowth: calculateGrowth(contentStats[0].count, prevContentStats[0].count),
                imageCount: imageStats[0].count || 0,
                imageGrowth: calculateGrowth(imageStats[0].count, prevImageStats[0].count),
                docCount: documentStats[0].count || 0,
                docGrowth: calculateGrowth(documentStats[0].count, prevDocumentStats[0].count),
                recentActivity: activities.map(activity => ({
                    ...activity,
                    timeAgo: formatTimeAgo(activity.created_at),
                    description: activity.description || 'Untitled'
                }))
            };

            console.log('Rendered stats:', {
                counts: {
                    content: stats.contentCount,
                    images: stats.imageCount,
                    docs: stats.docCount
                },
                activityCount: stats.recentActivity.length
            });

            res.render('dashboard/index', {
                user: req.session.user,
                stats: stats,
                style: '',
                script: ''
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            // Render with default stats on error
            res.render('dashboard/index', {
                user: req.session.user,
                stats: defaultStats, // Use default stats on error
                error: 'Failed to load some dashboard data',
                style: '',
                script: ''
            });
        }
    }
};

// Helper function to format time ago
function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000; // years
    if (interval > 1) return Math.floor(interval) + " years ago";
    
    interval = seconds / 2592000; // months
    if (interval > 1) return Math.floor(interval) + " months ago";
    
    interval = seconds / 86400; // days
    if (interval > 1) return Math.floor(interval) + " days ago";
    
    interval = seconds / 3600; // hours
    if (interval > 1) return Math.floor(interval) + " hours ago";
    
    interval = seconds / 60; // minutes
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    
    return Math.floor(seconds) + " seconds ago";
}

module.exports = dashboardController;