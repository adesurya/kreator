// services/SessionValidationService.js
class SessionValidationService {
    constructor() {
        // Run check every 6 hours
        setInterval(this.validateAllSessions.bind(this), 6 * 60 * 60 * 1000);
    }

    async validateAllSessions() {
        try {
            // Get all active accounts
            const [accounts] = await db.execute(
                'SELECT id, username, session_string FROM instagram_accounts WHERE is_active = true'
            );

            for (const account of accounts) {
                try {
                    const ig = new IgApiClient();
                    await ig.state.deserialize(JSON.parse(account.session_string));
                    
                    // Test session dengan request ringan
                    await ig.account.currentUser();
                } catch (error) {
                    // Mark session as invalid
                    await db.execute(
                        'UPDATE instagram_accounts SET is_active = false WHERE id = ?',
                        [account.id]
                    );

                    // Notify user via email/notification
                    await this.notifyUser(account);
                }
            }
        } catch (error) {
            console.error('Session validation error:', error);
        }
    }
}