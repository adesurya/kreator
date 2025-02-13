// middleware/auth.js
const db = require('../config/database');

const isAuthenticated = async (req, res, next) => {
    console.log('Session check:', req.session); // Debug log
    if (req.session && req.session.userId) {
        // Check if user has active subscription
        try {
            const [subscriptions] = await db.execute(
                `SELECT s.*, p.name as plan_name 
                 FROM user_subscriptions s
                 JOIN plans p ON s.plan_id = p.id
                 WHERE s.user_id = ? 
                 AND s.is_active = true 
                 AND s.end_date > CURRENT_TIMESTAMP()
                 ORDER BY s.end_date DESC
                 LIMIT 1`,
                [req.session.userId]
            );

            // If user is admin, bypass subscription check
            if (req.session.user.role === 'admin') {
                return next();
            }

            // If no active subscription and not on pricing page, redirect to pricing
            if (subscriptions.length === 0 && !req.originalUrl.includes('/pricing')) {
                // Store the original URL to redirect back after subscription
                req.session.returnTo = req.originalUrl;
                return res.redirect('/pricing');
            }

            return next();
        } catch (error) {
            console.error('Subscription check error:', error);
            return res.status(500).render('error', { 
                error: 'Error checking subscription status',
                user: req.session.user
            });
        }
    }
    res.redirect('/auth/login');
};

const isAdmin = (req, res, next) => {
    try {
        console.log('Admin check:', {
            session: req.session,
            user: req.session?.user,
            role: req.session?.user?.role
        });

        if (!req.session || !req.session.user) {
            return res.redirect('/auth/login');
        }

        if (req.session.user.role !== 'admin') {
            return res.redirect('/dashboard');
        }

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).render('error', {
            error: 'Authentication error',
            user: null
        });
    }
};

module.exports = { isAuthenticated, isAdmin };