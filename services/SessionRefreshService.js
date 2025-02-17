// services/SessionRefreshService.js
class SessionRefreshService {
    async refreshSession(accountId) {
        try {
            const [account] = await db.execute(
                'SELECT session_string FROM instagram_accounts WHERE id = ?',
                [accountId]
            );

            const ig = new IgApiClient();
            await ig.state.deserialize(JSON.parse(account[0].session_string));

            // Refresh session
            const newSession = await ig.state.serialize();
            
            // Update database
            await db.execute(
                'UPDATE instagram_accounts SET session_string = ? WHERE id = ?',
                [JSON.stringify(newSession), accountId]
            );

            return true;
        } catch (error) {
            console.error('Session refresh error:', error);
            return false;
        }
    }
}