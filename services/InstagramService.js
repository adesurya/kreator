// services/InstagramService.js
const { IgApiClient } = require('instagram-private-api');
const ProxyService = require('./ProxyService');
const fetch = require('node-fetch');
const Queue = require('bull');
const CryptoJS = require('crypto-js');
const db = require('../config/database');

class InstagramService {
    constructor() {
        this.postingQueue = new Queue('instagram-posting');
        this.setupQueueProcessor();
    }

    async loginAccount(userId, sessionString, proxyString = null) {
        try {
            // Setup proxy if provided
            let proxyUrl = null;
            if (proxyString) {
                try {
                    // Validate proxy string format
                    if (!this.isValidProxyString(proxyString)) {
                        throw new Error('Invalid proxy format');
                    }
                    proxyUrl = `http://${proxyString}`;
                } catch (error) {
                    throw new Error(`Proxy error: ${error.message}`);
                }
            }

            // Create IG instance with proxy
            const ig = new IgApiClient();
            if (proxyUrl) {
                ig.state.proxyUrl = proxyUrl;
            }

            // Test session dengan proxy jika ada
            const userInfo = await this.validateSessionWithApi(sessionString, proxyUrl);

            // Save to database with proxy info
            await db.execute(
                `INSERT INTO instagram_accounts 
                (user_id, username, session_string, proxy_url, is_active) 
                VALUES (?, ?, ?, ?, true)
                ON DUPLICATE KEY UPDATE 
                session_string = VALUES(session_string),
                proxy_url = VALUES(proxy_url),
                is_active = true`,
                [userId, userInfo.username, sessionString, proxyString]
            );

            return {
                success: true,
                username: userInfo.username
            };

        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    isValidProxyString(proxyString) {
        // Format: login:password@host:port
        const proxyRegex = /^[^:]+:[^@]+@[^:]+:\d+$/;
        return proxyRegex.test(proxyString);
    }

    async validateSessionWithApi(sessionId) {
        try {
            // Direct API request to Instagram
            const response = await fetch('https://i.instagram.com/api/v1/accounts/current_user/', {
                headers: {
                    'Cookie': `sessionid=${sessionId}`,
                    'User-Agent': 'Instagram 76.0.0.15.395 Android (24/7.0; 640dpi; 1440x2560; samsung; SM-G930F; herolte; samsungexynos8890; en_US; 138226743)',
                    'Accept': '*/*',
                    'Accept-Language': 'en-US',
                    'Accept-Encoding': 'gzip, deflate',
                    'X-IG-Capabilities': '3brTvw==',
                    'X-IG-Connection-Type': 'WIFI',
                    'X-IG-App-ID': '567067343352427'
                }
            });

            if (!response.ok) {
                throw new Error('Session validation failed');
            }

            const data = await response.json();
            if (!data.user) {
                throw new Error('Could not get user info');
            }

            return {
                username: data.user.username,
                userId: data.user.pk
            };
        } catch (error) {
            console.error('Session validation error:', error);
            throw new Error('Session validation failed. Please provide a fresh session ID.');
        }
    }
    // Clean session string
    cleanSessionString(sessionString) {
        try {
            // Remove any whitespace
            sessionString = sessionString.trim();

            // Handle full cookie string
            if (sessionString.includes('sessionid=')) {
                const matches = sessionString.match(/sessionid=([^;]+)/);
                if (matches && matches[1]) {
                    return matches[1].trim();
                }
            }

            // If it's already just the session ID
            if (sessionString.includes('%3A')) {
                return sessionString;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    // Validate session ID format
    isValidSessionId(sessionId) {
        // Update pattern untuk menerima special characters dari Instagram
        // Termasuk %, :, dan karakter special lainnya yang valid
        return /^[a-zA-Z0-9%:_-]{20,}$/.test(sessionId);
    }

    // Test session validity
    async testSession(sessionId) {
        try {
            const response = await fetch('https://www.instagram.com/accounts/edit/?__a=1', {
                headers: {
                    'Cookie': `sessionid=${sessionId}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Invalid session');
            }

            const data = await response.json();
            if (!data.user || !data.user.username) {
                throw new Error('Could not get user info');
            }

            return {
                username: data.user.username
            };
        } catch (error) {
            console.error('Test session error:', error);
            throw new Error('Session validation failed');
        }
    }

    async getBasicInfo(sessionId) {
        try {
            const response = await fetch('https://www.instagram.com/accounts/edit/?__a=1', {
                headers: {
                    'Cookie': `sessionid=${sessionId}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }

            const data = await response.json();
            return {
                username: data.user.username,
                userId: data.user.id
            };
        } catch (error) {
            throw new Error('Failed to validate session');
        }
    }

    extractSessionId(sessionString) {
        sessionString = sessionString.trim();

        // If it's already a clean session ID
        if (/^[a-zA-Z0-9_-]+$/.test(sessionString)) {
            return sessionString;
        }

        // Try to extract from cookie string
        const sessionMatch = sessionString.match(/sessionid=([^;]+)/);
        if (sessionMatch && sessionMatch[1]) {
            return sessionMatch[1].trim();
        }

        return null;
    }

    extractSessionId(cookieString) {
        const cookies = cookieString.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'sessionid') {
                return value;
            }
        }
        return null;
    }

    // Method untuk encrypt password
    encryptPassword(password) {
        return CryptoJS.AES.encrypt(
            password, 
            process.env.PASSWORD_ENCRYPTION_KEY
        ).toString();
    }

    // Method untuk decrypt password
    decryptPassword(encryptedPassword) {
        const bytes = CryptoJS.AES.decrypt(
            encryptedPassword, 
            process.env.PASSWORD_ENCRYPTION_KEY
        );
        return bytes.toString(CryptoJS.enc.Utf8);
    }

    async handleCheckpoint(ig, error) {
        try {
            // Get challenge choices
            const challenge = await ig.challenge.state();
            
            return {
                requiresVerification: true,
                challengeUrl: error.url,
                choices: challenge.step_data,
                challengeType: challenge.step_name
            };
        } catch (e) {
            throw new Error('Failed to handle verification challenge');
        }
    }

    async submitVerificationCode(accountId, code, type = 'sms') {
        try {
            const [account] = await db.execute(
                'SELECT session_data FROM instagram_accounts WHERE id = ?',
                [accountId]
            );

            const ig = new IgApiClient();
            const session = this.decryptSession(account[0].session_data);
            await ig.state.deserialize(session);

            let result;
            if (type === 'twoFactor') {
                result = await ig.account.twoFactorLogin({
                    verificationCode: code,
                    trustThisDevice: 1,
                });
            } else {
                result = await ig.challenge.sendSecurityCode(code);
            }

            // Update session
            const serialized = await ig.state.serialize();
            delete serialized.constants;
            await this.updateSession(accountId, serialized);

            return { success: true, result };
        } catch (error) {
            throw new Error(`Verification failed: ${error.message}`);
        }
    }

    encryptSession(session) {
        return CryptoJS.AES.encrypt(
            JSON.stringify(session), 
            process.env.SESSION_ENCRYPTION_KEY
        ).toString();
    }

    decryptSession(encryptedSession) {
        const bytes = CryptoJS.AES.decrypt(
            encryptedSession, 
            process.env.SESSION_ENCRYPTION_KEY
        );
        return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    }

    // Encrypt password untuk disimpan di database
    encryptPassword(password) {
        return CryptoJS.AES.encrypt(password, process.env.ENCRYPTION_KEY).toString();
    }

    // Decrypt password
    decryptPassword(encryptedPassword) {
        const bytes = CryptoJS.AES.decrypt(encryptedPassword, process.env.ENCRYPTION_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    }

    

    async requestVerificationCode(accountId, method = 'sms') {
        try {
            const [account] = await db.execute(
                'SELECT username, encrypted_password, proxy_url FROM instagram_accounts WHERE id = ?',
                [accountId]
            );

            if (!account[0]) throw new Error('Account not found');

            const ig = new IgApiClient();
            if (account[0].proxy_url) {
                ig.state.proxyUrl = account[0].proxy_url;
            }
            
            ig.state.generateDevice(account[0].username);
            
            await ig.challenge.auto(true); // true for auto-selection of verification method
            await ig.challenge.selectVerifyMethod(method);

            return { success: true, message: `Verification code sent via ${method}` };
        } catch (error) {
            throw new Error(`Failed to request verification code: ${error.message}`);
        }
    }

    async submitVerificationCode(accountId, code) {
        try {
            const [account] = await db.execute(
                'SELECT username, encrypted_password, proxy_url FROM instagram_accounts WHERE id = ?',
                [accountId]
            );

            if (!account[0]) throw new Error('Account not found');

            const ig = new IgApiClient();
            if (account[0].proxy_url) {
                ig.state.proxyUrl = account[0].proxy_url;
            }
            
            ig.state.generateDevice(account[0].username);
            
            // Submit verification code
            await ig.challenge.sendSecurityCode(code);
            
            // Update account status
            await db.execute(
                'UPDATE instagram_accounts SET status = "active" WHERE id = ?',
                [accountId]
            );

            return { success: true };
        } catch (error) {
            throw new Error(`Verification failed: ${error.message}`);
        }
    }

    async checkSession(accountId) {
        try {
            const [account] = await db.execute(
                'SELECT session_data, username, encrypted_password FROM instagram_accounts WHERE id = ?',
                [accountId]
            );

            if (!account[0]) {
                throw new Error('Account not found');
            }

            const ig = new IgApiClient();
            await ig.state.deserialize(JSON.parse(account[0].session_data));

            try {
                // Test session dengan request ringan
                await ig.user.info(ig.state.cookieUserId);
                return { valid: true };
            } catch (error) {
                // Session expired, coba login ulang
                const password = this.decryptPassword(account[0].encrypted_password);
                await this.loginAccount(account[0].user_id, account[0].username, password);
                return { valid: true, renewed: true };
            }
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    async schedulePost(accountId, mediaFiles, caption, scheduleTime) {
        try {
            // Validasi schedule time
            if (new Date(scheduleTime) <= new Date()) {
                throw new Error('Schedule time must be in the future');
            }

            // Simpan post ke database
            const [result] = await db.execute(
                `INSERT INTO scheduled_posts 
                (account_id, media_type, media_urls, caption, schedule_time) 
                VALUES (?, ?, ?, ?, ?)`,
                [
                    accountId,
                    mediaFiles.length > 1 ? 'carousel' : mediaFiles[0].mimetype.includes('video') ? 'video' : 'photo',
                    JSON.stringify(mediaFiles.map(f => f.path)),
                    caption,
                    scheduleTime
                ]
            );

            // Tambahkan ke queue
            await this.postingQueue.add(
                {
                    postId: result.insertId,
                    accountId,
                    mediaFiles: mediaFiles.map(f => f.path),
                    caption
                },
                {
                    delay: new Date(scheduleTime) - new Date()
                }
            );

            return result.insertId;
        } catch (error) {
            throw new Error(`Failed to schedule post: ${error.message}`);
        }
    }

    setupQueueProcessor() {
        this.postingQueue.process(async (job) => {
            const { postId, accountId, mediaFiles, caption } = job.data;

            try {
                const [account] = await db.execute(
                    'SELECT session_data FROM instagram_accounts WHERE id = ?',
                    [accountId]
                );

                if (!account[0]) {
                    throw new Error('Account not found');
                }

                const ig = new IgApiClient();
                await ig.state.deserialize(JSON.parse(account[0].session_data));

                // Upload media
                let mediaId;
                if (mediaFiles.length > 1) {
                    // Handle carousel
                    const inputMedias = await Promise.all(
                        mediaFiles.map(path => ig.upload.photo({ file: path }))
                    );
                    mediaId = await ig.publish.album({
                        items: inputMedias,
                        caption
                    });
                } else if (mediaFiles[0].includes('video')) {
                    // Handle video/reel
                    mediaId = await ig.publish.video({
                        video: mediaFiles[0],
                        caption
                    });
                } else {
                    // Handle single photo
                    mediaId = await ig.publish.photo({
                        file: mediaFiles[0],
                        caption
                    });
                }

                // Update status di database
                await db.execute(
                    `UPDATE scheduled_posts 
                     SET status = 'published', 
                         instagram_post_id = ? 
                     WHERE id = ?`,
                    [mediaId, postId]
                );

            } catch (error) {
                // Update error status
                await db.execute(
                    `UPDATE scheduled_posts 
                     SET status = 'failed', 
                         error_message = ? 
                     WHERE id = ?`,
                    [error.message, postId]
                );
                throw error;
            }
        });
    }

    async getComments(accountId, postId) {
        try {
            const [account] = await db.execute(
                'SELECT session_data FROM instagram_accounts WHERE id = ?',
                [accountId]
            );

            const ig = new IgApiClient();
            await ig.state.deserialize(JSON.parse(account[0].session_data));

            const comments = await ig.media.comments(postId);
            
            // Save to database
            await Promise.all(comments.map(comment => 
                db.execute(
                    `INSERT IGNORE INTO instagram_comments 
                     (account_id, post_id, comment_id, username, text) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [accountId, postId, comment.id, comment.user.username, comment.text]
                )
            ));

            return comments;
        } catch (error) {
            throw new Error(`Failed to fetch comments: ${error.message}`);
        }
    }

    async replyToComment(accountId, postId, commentId, replyText) {
        try {
            const [account] = await db.execute(
                'SELECT session_data FROM instagram_accounts WHERE id = ?',
                [accountId]
            );

            const ig = new IgApiClient();
            await ig.state.deserialize(JSON.parse(account[0].session_data));

            const reply = await ig.media.comment({
                mediaId: postId,
                text: replyText,
                replyToCommentId: commentId
            });

            return reply;
        } catch (error) {
            throw new Error(`Failed to reply to comment: ${error.message}`);
        }
    }

    async checkNotifications(accountId) {
        try {
            const [account] = await db.execute(
                'SELECT session_data FROM instagram_accounts WHERE id = ?',
                [accountId]
            );

            const ig = new IgApiClient();
            await ig.state.deserialize(JSON.parse(account[0].session_data));

            // Get activity feed
            const activity = await ig.feed.accountActivity();
            const items = await activity.items();

            // Save notifications
            await Promise.all(items.map(item => 
                db.execute(
                    `INSERT IGNORE INTO instagram_notifications 
                     (account_id, type, content) 
                     VALUES (?, ?, ?)`,
                    [
                        accountId,
                        this.getNotificationType(item),
                        JSON.stringify(item)
                    ]
                )
            ));

            return items;
        } catch (error) {
            throw new Error(`Failed to fetch notifications: ${error.message}`);
        }
    }

    getNotificationType(notification) {
        if (notification.type === 1) return 'like';
        if (notification.type === 2) return 'comment';
        if (notification.type === 3) return 'follow';
        if (notification.type === 12) return 'mention';
        return 'other';
    }
}

module.exports = new InstagramService();