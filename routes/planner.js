const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');
const puppeteer = require('puppeteer');

const plannerController = {
    renderCalendar: async (req, res) => {
        try {
            // Fetch posts
            const [rows] = await db.execute(
                `SELECT 
                    id,
                    title,
                    description,
                    DATE_FORMAT(post_date, '%Y-%m-%d') as post_date,
                    TIME_FORMAT(post_time, '%H:%i:%s') as post_time,
                    social_media
                FROM social_media_posts 
                WHERE user_id = ?
                ORDER BY post_date, post_time`,
                [req.session.userId]
            );

            // Format events for calendar
            const events = rows.map(post => {
                try {
                    return {
                        id: post.id,
                        title: post.title,
                        start: `${post.post_date}T${post.post_time}`,
                        description: post.description,
                        social_media: typeof post.social_media === 'string' ? 
                            JSON.parse(post.social_media) : post.social_media
                    };
                } catch (err) {
                    console.error('Error parsing post:', err);
                    return null;
                }
            }).filter(event => event !== null);

            res.render('planner/calendar', {
                events: JSON.stringify(events),
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading calendar:', error);
            res.status(500).send('Failed to load calendar');
        }
    },

    addPost: async (req, res) => {
        try {
            const { post_date, post_time, title, description, social_media } = req.body;

            // Validate input
            if (!post_date || !post_time || !title || !description || !social_media) {
                return res.status(400).json({ error: 'All fields are required' });
            }

            // Insert post
            const [result] = await db.execute(
                'INSERT INTO social_media_posts (user_id, post_date, post_time, title, description, social_media) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    req.session.userId,
                    post_date,
                    post_time,
                    title,
                    description,
                    JSON.stringify(social_media)
                ]
            );

            res.json({
                success: true,
                post: {
                    id: result.insertId,
                    title,
                    start: `${post_date}T${post_time}`,
                    description,
                    social_media
                }
            });
        } catch (error) {
            console.error('Error adding post:', error);
            res.status(500).json({ error: 'Failed to add post' });
        }
    },

    exportCalendar: async (req, res) => {
        let browser = null;
        try {
            const { format, month, year } = req.query;
    
            // Fetch posts from database
            const [posts] = await db.execute(
                `SELECT 
                    title,
                    description,
                    DATE_FORMAT(post_date, '%Y-%m-%d') as post_date,
                    TIME_FORMAT(post_time, '%H:%i') as post_time,
                    social_media
                FROM social_media_posts 
                WHERE user_id = ? 
                    AND MONTH(post_date) = ? 
                    AND YEAR(post_date) = ?
                ORDER BY post_date, post_time`,
                [req.session.userId, parseInt(month), parseInt(year)]
            );
    
            const formattedPosts = posts.map(post => ({
                ...post,
                social_media: typeof post.social_media === 'string' ? 
                    JSON.parse(post.social_media) : post.social_media,
                date: new Date(post.post_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                time: new Date(`2000-01-01T${post.post_time}`).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                })
            }));
    
            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
    
            // Generate HTML content
            const htmlContent = await new Promise((resolve, reject) => {
                res.render('planner/export', {
                    posts: formattedPosts,
                    month: monthName,
                    year: year,
                    user: req.session.user
                }, (err, html) => {
                    if (err) reject(err);
                    else resolve(html);
                });
            });
    
            // Initialize browser
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox'
                ]
            });
    
            const page = await browser.newPage();
    
            // Set content with proper waiting
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
            // Ensure all content is loaded
            await page.evaluate(() => document.fonts.ready);
    
            if (format === 'pdf') {
                const pdfBuffer = await page.pdf({
                    format: 'A4',
                    printBackground: true,
                    margin: {
                        top: '20mm',
                        right: '20mm',
                        bottom: '20mm',
                        left: '20mm'
                    },
                    displayHeaderFooter: false,
                    preferCSSPageSize: false
                });
    
                // Close browser before sending response
                await browser.close();
                browser = null;
    
                // Send PDF response
                res.contentType('application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="calendar-${year}-${month}.pdf"`);
                res.setHeader('Content-Length', pdfBuffer.length);
                return res.send(pdfBuffer);
    
            } else {
                const imageBuffer = await page.screenshot({
                    fullPage: true,
                    type: 'png',
                    omitBackground: false
                });
    
                // Close browser before sending response
                await browser.close();
                browser = null;
    
                // Send PNG response
                res.contentType('image/png');
                res.setHeader('Content-Disposition', `attachment; filename="calendar-${year}-${month}.png"`);
                res.setHeader('Content-Length', imageBuffer.length);
                return res.send(imageBuffer);
            }
    
        } catch (error) {
            console.error('Export error:', error);
            if (browser) {
                try {
                    await browser.close();
                } catch (closeError) {
                    console.error('Error closing browser:', closeError);
                }
            }
            return res.status(500).json({
                error: 'Failed to export calendar',
                details: error.message
            });
        }
    },

    deletePost: async (req, res) => {
        try {
            const { postId } = req.params;

            // Delete the post
            await db.execute(
                'DELETE FROM social_media_posts WHERE id = ? AND user_id = ?',
                [postId, req.session.userId]
            );

            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting post:', error);
            res.status(500).json({ error: 'Failed to delete post' });
        }
    }
};

// Define routes
router.get('/', isAuthenticated, plannerController.renderCalendar);
router.post('/post', isAuthenticated, plannerController.addPost);
router.get('/export', isAuthenticated, plannerController.exportCalendar);
router.delete('/post/:postId', isAuthenticated, plannerController.deletePost);

module.exports = router;