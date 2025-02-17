// middleware/instagramRateLimit.js
const rateLimit = require('express-rate-limit');

const instagramRateLimit = {
    // API Rate Limiter
    apiLimiter: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP/user to 100 requests per window
        message: {
            error: 'Too many requests from this IP, please try again after 15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false
    }),

    // Check rate limits for specific account
    checkAccountLimit: async (req, res, next) => {
        const accountId = req.params.accountId || req.body.accountId;
        
        if (!accountId) return next();

        try {
            const [requests] = await db.execute(
                `SELECT COUNT(*) as count 
                 FROM api_requests 
                 WHERE account_id = ? 
                 AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
                [accountId]
            );

            if (requests[0].count >= 200) {
                return res.status(429).json({
                    error: 'Rate limit exceeded for this account. Please try again later.'
                });
            }

            // Log request
            await db.execute(
                'INSERT INTO api_requests (account_id) VALUES (?)',
                [accountId]
            );

            next();
        } catch (error) {
            next(error);
        }
    }
};

module.exports = instagramRateLimit;