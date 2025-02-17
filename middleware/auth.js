// middleware/auth.js
const db = require('../config/database');

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/auth/login');
};

const checkSubscription = async (req, res, next) => {
    // Skip subscription check for certain paths
    const publicPaths = ['/pricing', '/payment', '/auth/logout'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    // Skip for admin users
    if (req.session.user?.role === 'admin') {
        return next();
    }

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

        if (subscriptions.length === 0) {
            req.session.returnTo = req.originalUrl;
            return res.redirect('/pricing');
        }

        req.subscription = subscriptions[0];
        next();
    } catch (error) {
        console.error('Subscription check error:', error);
        res.status(500).render('error', {
            error: 'Error checking subscription',
            user: req.session.user
        });
    }
};

const isAdmin = (req, res, next) => {
    if (req.session?.user?.role === 'admin') {
        return next();
    }
    res.redirect('/auth/login');
};

module.exports = { isAuthenticated, isAdmin, checkSubscription };