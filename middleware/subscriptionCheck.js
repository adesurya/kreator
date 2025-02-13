// middleware/subscriptionCheck.js
const db = require('../config/database');

const checkSubscription = async (req, res, next) => {
    // Skip check for admin users
    if (req.session.user?.role === 'admin') {
        return next();
    }

    try {
        // Check for active subscription
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
            // Store return URL for redirect after payment
            req.session.returnTo = req.originalUrl;
            return res.redirect('/pricing');
        }

        // Add subscription info to request
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


module.exports = { checkSubscription };