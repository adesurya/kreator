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
            `SELECT * FROM user_subscriptions 
             WHERE user_id = ? 
             AND is_active = true 
             AND end_date > CURRENT_TIMESTAMP()
             ORDER BY end_date DESC
             LIMIT 1`,
            [req.session.userId]
        );

        if (subscriptions.length === 0) {
            // No active subscription found
            if (req.xhr) {
                return res.status(403).json({ 
                    error: 'Subscription required',
                    redirectUrl: '/payment/plans'
                });
            }
            
            // Store intended URL for redirect after payment
            req.session.returnTo = req.originalUrl;
            return res.redirect('/payment/plans');
        }

        // Add subscription info to request
        req.subscription = subscriptions[0];
        next();
    } catch (error) {
        console.error('Subscription check error:', error);
        res.status(500).send('Error checking subscription');
    }
};

module.exports = { checkSubscription };