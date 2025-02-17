// controllers/InstagramController.js
const InstagramService = require('../services/InstagramService');
const db = require('../config/database');

const instagramController = {
    // Render dashboard
    renderDashboard: async (req, res) => {
        try {
            const [accounts] = await db.execute(
                `SELECT * FROM instagram_accounts 
                 WHERE user_id = ? AND is_active = true`,
                [req.session.userId]
            );

            const [scheduledPosts] = await db.execute(
                `SELECT sp.*, ia.username as instagram_username 
                 FROM scheduled_posts sp
                 JOIN instagram_accounts ia ON sp.account_id = ia.id
                 WHERE ia.user_id = ?
                 ORDER BY sp.schedule_time ASC`,
                [req.session.userId]
            );

            res.render('instagram/dashboard', {
                user: req.session.user,
                accounts: accounts || [],
                scheduledPosts: scheduledPosts || [],
                error: null
            });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.render('instagram/dashboard', {
                user: req.session.user,
                accounts: [],
                scheduledPosts: [],
                error: 'Failed to load dashboard data'
            });
        }
    },

    // Add new account
    addAccount: async (req, res) => {
        try {
            const { sessionString } = req.body;
            
            if (!sessionString) {
                return res.status(400).json({
                    error: 'Session string is required'
                });
            }

            const result = await InstagramService.loginAccount(
                req.session.userId,
                sessionString
            );

            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Get user's accounts
    getAccounts: async (req, res) => {
        try {
            const [accounts] = await db.execute(
                `SELECT * FROM instagram_accounts 
                 WHERE user_id = ? AND is_active = true`,
                [req.session.userId]
            );
            res.json({ accounts });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get accounts' });
        }
    },

    // Remove account
    removeAccount: async (req, res) => {
        try {
            const { accountId } = req.params;
            await db.execute(
                'UPDATE instagram_accounts SET is_active = false WHERE id = ? AND user_id = ?',
                [accountId, req.session.userId]
            );
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to remove account' });
        }
    },

    // Schedule post
    schedulePost: async (req, res) => {
        try {
            const { accountId, caption, scheduleTime, mediaUrls } = req.body;
            
            if (!accountId || !scheduleTime || !mediaUrls) {
                return res.status(400).json({
                    error: 'Missing required fields'
                });
            }

            const [result] = await db.execute(
                `INSERT INTO scheduled_posts 
                (account_id, media_urls, caption, schedule_time) 
                VALUES (?, ?, ?, ?)`,
                [accountId, JSON.stringify(mediaUrls), caption, scheduleTime]
            );

            res.json({
                success: true,
                postId: result.insertId
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to schedule post' });
        }
    },

    // Get scheduled posts
    getScheduledPosts: async (req, res) => {
        try {
            const { accountId } = req.params;
            const [posts] = await db.execute(
                `SELECT * FROM scheduled_posts 
                 WHERE account_id = ? ORDER BY schedule_time ASC`,
                [accountId]
            );
            res.json({ posts });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get scheduled posts' });
        }
    },

    // Delete scheduled post
    deleteScheduledPost: async (req, res) => {
        try {
            const { postId } = req.params;
            await db.execute(
                'DELETE FROM scheduled_posts WHERE id = ?',
                [postId]
            );
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete post' });
        }
    },

    async schedulePost(req, res) {
        try {
            const { accountId } = req.body;
            const files = req.files;
            const caption = req.body.caption;
            const scheduleTime = new Date(req.body.scheduleTime);
    
            // Validate files
            if (!files || files.length === 0) {
                throw new Error('No media files provided');
            }
            if (files.length > 10) {
                throw new Error('Maximum 10 files allowed');
            }
    
            // Validate schedule time
            if (scheduleTime <= new Date()) {
                throw new Error('Schedule time must be in the future');
            }
    
            // Process and store media files
            const mediaUrls = await Promise.all(files.map(async file => {
                // Store file and get URL
                const filePath = `/uploads/instagram/${file.filename}`;
                return filePath;
            }));
    
            // Create scheduled post
            await db.execute(
                `INSERT INTO scheduled_posts 
                (account_id, media_urls, caption, schedule_time, status) 
                VALUES (?, ?, ?, ?, 'pending')`,
                [accountId, JSON.stringify(mediaUrls), caption, scheduleTime]
            );
    
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    
    async getAccountStats(req, res) {
        try {
            const { accountId } = req.params;
    
            // Get account statistics
            const [stats] = await db.execute(
                `SELECT 
                    (SELECT COUNT(*) FROM scheduled_posts WHERE account_id = ? AND status = 'published') as total_posts,
                    (SELECT COUNT(*) FROM scheduled_posts WHERE account_id = ? AND status = 'pending') as scheduled_posts,
                    (SELECT COUNT(*) FROM scheduled_posts WHERE account_id = ? AND status = 'failed') as failed_posts
                `,
                [accountId, accountId, accountId]
            );
    
            // Calculate success rate
            const totalAttempted = stats[0].total_posts + stats[0].failed_posts;
            const successRate = totalAttempted > 0 
                ? Math.round((stats[0].total_posts / totalAttempted) * 100) 
                : 100;
    
            // Get recent activity
            const [activity] = await db.execute(
                `SELECT * FROM scheduled_posts 
                 WHERE account_id = ? 
                 ORDER BY schedule_time DESC 
                 LIMIT 5`,
                [accountId]
            );
    
            res.json({
                totalPosts: stats[0].total_posts,
                scheduledPosts: stats[0].scheduled_posts,
                successRate: successRate,
                recentActivity: activity.map(post => ({
                    type: 'Post',
                    date: post.schedule_time,
                    status: post.status
                }))
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = instagramController;