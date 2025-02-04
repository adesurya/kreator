const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

const ideCreatorController = {
    renderIdeCreator: (req, res) => {
        res.render('idekreator/index', { 
            user: req.session.user,
            style: '',
            script: ''
        });
    },

    startConversation: async (req, res) => {
        try {
            const response = await axios.post(
                `https://rag.epsilla.com/conversation/${process.env.IDEKREATOR_NAMESPACE}/${process.env.IDEKREATOR_APP_ID}/create`,
                { summary: req.body.summary },
                { 
                    headers: { 
                        'X-API-Key': process.env.IDEKREATOR_API_KEY,
                        'Content-Type': 'application/json'
                    } 
                }
            );

            if (response.data.statusCode === 200) {
                await db.execute(
                    'INSERT INTO ide_conversations (id, user_id, summary) VALUES (?, ?, ?)',
                    [response.data.result.conversationId, req.session.userId, req.body.summary]
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
                `https://rag.epsilla.com/chat/${process.env.IDEKREATOR_NAMESPACE}/${process.env.IDEKREATOR_APP_ID}/${req.params.conversationId}`,
                { message: req.body.message },
                { 
                    headers: { 
                        'X-API-Key': process.env.IDEKREATOR_API_KEY,
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
                `https://rag.epsilla.com/stream/${process.env.IDEKREATOR_NAMESPACE}/${process.env.IDEKREATOR_APP_ID}/${req.params.requestId}`,
                { 
                    headers: { 
                        'X-API-Key': process.env.IDEKREATOR_API_KEY 
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
                `https://rag.epsilla.com/conversation/${process.env.IDEKREATOR_NAMESPACE}/${process.env.IDEKREATOR_APP_ID}/${req.params.conversationId}/${req.params.limit}`,
                { 
                    headers: { 
                        'X-API-Key': process.env.IDEKREATOR_API_KEY 
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
            const [conversations] = await db.execute(
                'SELECT id as ConversationId, summary, UNIX_TIMESTAMP(created_at) as CreatedAt ' +
                'FROM ide_conversations WHERE user_id = ? ORDER BY created_at DESC',
                [req.session.userId]
            );
            
            const formattedConversations = conversations.map(conv => ({
                ...conv,
                CreatedAt: Number(conv.CreatedAt)
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
            await axios.delete(
                `https://rag.epsilla.com/conversation/${process.env.IDEKREATOR_NAMESPACE}/${process.env.IDEKREATOR_APP_ID}/${req.params.conversationId}`,
                { 
                    headers: { 
                        'X-API-Key': process.env.IDEKREATOR_API_KEY 
                    } 
                }
            );

            await db.execute(
                'DELETE FROM ide_conversations WHERE id = ? AND user_id = ?',
                [req.params.conversationId, req.session.userId]
            );

            res.json({
                statusCode: 200,
                message: "Conversation deleted successfully"
            });
        } catch (error) {
            console.error('Delete conversation error:', error);
            res.status(500).json({ error: 'Failed to delete conversation' });
        }
    }
};

// Define routes
router.get('/', isAuthenticated, ideCreatorController.renderIdeCreator);
router.post('/conversation/start', isAuthenticated, ideCreatorController.startConversation);
router.post('/message/:conversationId', isAuthenticated, ideCreatorController.sendMessage);
router.get('/stream/:requestId', isAuthenticated, ideCreatorController.getStreamResponse);
router.get('/history/:conversationId/:limit', isAuthenticated, ideCreatorController.getHistory);
router.get('/conversations', isAuthenticated, ideCreatorController.getAllConversations);
router.delete('/conversation/:conversationId', isAuthenticated, ideCreatorController.deleteConversation);

module.exports = router;