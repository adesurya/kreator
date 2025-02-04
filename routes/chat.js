// routes/chat.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

const chatController = {
    renderChat: (req, res) => {
        res.render('chat/index', { 
            user: req.session.user,
            style: '',
            script: ''
        });
    },

    startConversation: async (req, res) => {
        try {
            // Check if user already has an active conversation
            const [existingConvs] = await db.execute(
                'SELECT COUNT(*) as count FROM conversations WHERE user_id = ?',
                [req.session.userId]
            );

            if (existingConvs[0].count >= 10) { // Limit conversations per user
                return res.status(400).json({ 
                    error: 'Maximum conversation limit reached. Please delete some old conversations.' 
                });
            }

            const response = await axios.post(
                `https://rag.epsilla.com/conversation/${process.env.EPSILLA_NAMESPACE}/${process.env.EPSILLA_APP_ID}/create`,
                { summary: req.body.summary || 'New Conversation' },
                { 
                    headers: { 
                        'X-API-Key': process.env.EPSILLA_API_KEY,
                        'Content-Type': 'application/json'
                    } 
                }
            );

            if (response.data.statusCode === 200) {
                // Delete old conversation if exists with same ID
                await db.execute(
                    'DELETE FROM conversations WHERE id = ?',
                    [response.data.result.conversationId]
                );

                // Insert new conversation
                await db.execute(
                    'INSERT INTO conversations (id, user_id, summary) VALUES (?, ?, ?)',
                    [
                        response.data.result.conversationId, 
                        req.session.userId,
                        req.body.summary || 'New Conversation'
                    ]
                );
            }

            res.json(response.data);
        } catch (error) {
            console.error('Start conversation error:', error);
            res.status(500).json({ error: 'Failed to start conversation' });
        }
    },

    sendMessage: async (req, res) => {
        try {
            const response = await axios.post(
                `https://rag.epsilla.com/chat/${process.env.EPSILLA_NAMESPACE}/${process.env.EPSILLA_APP_ID}/${req.params.conversationId}`,
                { message: req.body.message },
                { 
                    headers: { 
                        'X-API-Key': process.env.EPSILLA_API_KEY,
                        'Content-Type': 'application/json'
                    } 
                }
            );
            res.json(response.data);
        } catch (error) {
            console.error('Send message error:', error);
            res.status(500).json({ error: 'Failed to send message' });
        }
    },

    getStreamResponse: async (req, res) => {
        try {
            const response = await axios.get(
                `https://rag.epsilla.com/stream/${process.env.EPSILLA_NAMESPACE}/${process.env.EPSILLA_APP_ID}/${req.params.requestId}`,
                { 
                    headers: { 
                        'X-API-Key': process.env.EPSILLA_API_KEY 
                    } 
                }
            );
            res.json(response.data);
        } catch (error) {
            console.error('Stream response error:', error);
            res.status(500).json({ error: 'Failed to get stream response' });
        }
    },

    getHistory: async (req, res) => {
        try {
            const response = await axios.get(
                `https://rag.epsilla.com/conversation/${process.env.EPSILLA_NAMESPACE}/${process.env.EPSILLA_APP_ID}/${req.params.conversationId}/${req.params.limit}`,
                { 
                    headers: { 
                        'X-API-Key': process.env.EPSILLA_API_KEY 
                    } 
                }
            );
            res.json(response.data);
        } catch (error) {
            console.error('Get history error:', error);
            res.status(500).json({ error: 'Failed to get conversation history' });
        }
    },

    getAllConversations: async (req, res) => {
        try {
            // Ambil dari database lokal
            const [conversations] = await db.execute(
                'SELECT id as ConversationId, summary, UNIX_TIMESTAMP(created_at) as CreatedAt ' +
                'FROM conversations WHERE user_id = ? ORDER BY created_at DESC',
                [req.session.userId]
            );
            
            // Format data
            const formattedConversations = conversations.map(conv => ({
                ...conv,
                CreatedAt: Number(conv.CreatedAt) // Convert to number to avoid invalid date
            }));

            res.json({ 
                statusCode: 200, 
                result: formattedConversations
            });
        } catch (error) {
            console.error('Get conversations error:', error);
            res.status(500).json({ error: 'Failed to get conversations' });
        }
    },

    deleteConversation: async (req, res) => {
        try {
            const response = await axios.delete(
                `https://rag.epsilla.com/conversation/${process.env.EPSILLA_NAMESPACE}/${process.env.EPSILLA_APP_ID}/${req.params.conversationId}`,
                { 
                    headers: { 
                        'X-API-Key': process.env.EPSILLA_API_KEY 
                    } 
                }
            );

            // Hapus dari database lokal
            await db.execute(
                'DELETE FROM conversations WHERE id = ? AND user_id = ?',
                [req.params.conversationId, req.session.userId]
            );

            res.json(response.data);
        } catch (error) {
            console.error('Delete conversation error:', error);
            res.status(500).json({ error: 'Failed to delete conversation' });
        }
    }
};

// Define routes
router.get('/', isAuthenticated, chatController.renderChat);
router.post('/conversation/start', isAuthenticated, chatController.startConversation);
router.post('/message/:conversationId', isAuthenticated, chatController.sendMessage);
router.get('/stream/:requestId', isAuthenticated, chatController.getStreamResponse);
router.get('/history/:conversationId/:limit', isAuthenticated, chatController.getHistory);
router.get('/conversations', isAuthenticated, chatController.getAllConversations);
router.delete('/conversation/:conversationId', isAuthenticated, chatController.deleteConversation);

module.exports = router;