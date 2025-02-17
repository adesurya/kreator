// middleware/instagramSession.js
const InstagramService = require('../services/InstagramService');

async function checkInstagramSession(req, res, next) {
    // Skip for login/register routes
    if (req.path.includes('/auth/')) return next();

    try {
        if (req.session && req.session.userId) {
            // Check if user has any Instagram accounts
            const [accounts] = await db.execute(
                'SELECT id FROM instagram_accounts WHERE user_id = ? AND is_active = true',
                [req.session.userId]
            );

            res.locals.hasInstagramAccounts = accounts.length > 0;

            // Check sessions if accessing Instagram routes
            if (req.path.startsWith('/instagram/') && accounts.length > 0) {
                for (const account of accounts) {
                    const status = await InstagramService.checkSession(account.id);
                    if (!status.valid) {
                        console.warn(`Invalid session for account ${account.id}`);
                        // Session will be refreshed on next request
                    }
                }
            }
        }
        next();
    } catch (error) {
        console.error('Instagram session check error:', error);
        next();
    }
}

module.exports = { checkInstagramSession };