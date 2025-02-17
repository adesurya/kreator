// services/ProxyService.js
class ProxyService {
    async addProxy(accountId, proxyString) {
        // Format: protocol://username:password@host:port
        try {
            const proxyUrl = new URL(proxyString);
            
            await db.execute(
                'UPDATE instagram_accounts SET proxy_url = ? WHERE id = ?',
                [proxyString, accountId]
            );

            return true;
        } catch (error) {
            throw new Error('Invalid proxy format');
        }
    }

    async getWorkingProxy() {
        const proxies = [
            /* List of backup proxies */
        ];
        
        for (const proxy of proxies) {
            try {
                const response = await fetch('https://api.instagram.com', {
                    agent: new HttpsProxyAgent(proxy)
                });
                if (response.ok) return proxy;
            } catch (error) {
                continue;
            }
        }
        return null;
    }
}