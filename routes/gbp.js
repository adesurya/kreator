const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// Configure OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const gbpController = {
    renderGBP: (req, res) => {
        res.render('gbp/index', { 
            user: req.session.user,
            style: '',
            script: ''
        });
    },

    startConversation: async (req, res) => {
        try {
            // Generate a unique conversation ID
            const conversationId = 'gbp_' + Date.now();
            const requestId = 'req_' + Date.now();
            
            // Store the conversation in database
            await db.execute(
                'INSERT INTO gbp_conversations (id, user_id, summary) VALUES (?, ?, ?)',
                [conversationId, req.session.user.id, req.body.summary]
            );

            // Store initial system message
            const systemPrompt = `Anda adalah penulis konten profesional untuk Google Business Profile dengan pengalaman lebih dari 20 tahun. Anda akan membantu membuat konten berdasarkan input yang diberikan.`;
            
            await db.execute(
                'INSERT INTO gbp_messages (conversation_id, role, content) VALUES (?, ?, ?)',
                [conversationId, 'assistant', systemPrompt]
            );

            res.json({
                statusCode: 200,
                result: {
                    conversationId: conversationId,
                    requestId: requestId
                }
            });
        } catch (error) {
            console.error('Start GBP conversation error:', error);
            res.status(500).json({ error: 'Failed to start conversation' });
        }
    },

    sendMessage: async (req, res) => {
        try {
            const { message } = req.body;
            const conversationId = req.params.conversationId;

            // Get conversation history
            const [messages] = await db.execute(
                'SELECT role, content FROM gbp_messages WHERE conversation_id = ? ORDER BY created_at ASC',
                [conversationId]
            );

            // Format messages for OpenAI
            const formattedMessages = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Add current message with enhanced prompt
            formattedMessages.push({
                role: 'user',
                content: `Buatkan konten Google Business Profile untuk: ${message}

Harap sertakan:
1. Deskripsi bisnis (maksimal 750 karakter)
2. 5 ide post bisnis dengan konten lengkap
3. 10 kategori bisnis yang relevan
4. 15 atribut bisnis penting
5. 10 deskripsi layanan (100 karakter per layanan)
6. 10 deskripsi produk (maksimal 1000 karakter per produk)
7. 5 pasang Q&A untuk bisnis
8. 20 kata kunci SEO yang relevan

Format respons dengan jelas menggunakan markdown.`
            });

            // Store user message
            await db.execute(
                'INSERT INTO gbp_messages (conversation_id, role, content) VALUES (?, ?, ?)',
                [conversationId, 'user', message]
            );

            // Call OpenAI API without streaming
            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: formattedMessages,
                temperature: 0.7,
                max_tokens: 2500
            });

            const aiResponse = completion.choices[0].message.content;

            // Store AI response
            await db.execute(
                'INSERT INTO gbp_messages (conversation_id, role, content) VALUES (?, ?, ?)',
                [conversationId, 'assistant', aiResponse]
            );

            res.json({
                statusCode: 200,
                result: {
                    content: aiResponse
                }
            });

        } catch (error) {
            console.error('Send GBP message error:', error);
            res.status(500).json({ error: 'Failed to send message' });
        }
    },
    
    // Fungsi getStreamResponse juga perlu diperbarui
    getStreamResponse: async (req, res) => {
        try {
            const requestId = req.params.requestId;
            const requestData = req.session[requestId];
    
            if (!requestData) {
                return res.status(404).json({ error: 'Request not found' });
            }
    
            if (requestData.status === 'error') {
                delete req.session[requestId];
                return res.status(500).json({ error: requestData.error });
            }
    
            const response = {
                statusCode: 200,
                result: {
                    completed: requestData.status === 'completed',
                    content: requestData.content
                }
            };
    
            if (requestData.status === 'completed') {
                delete req.session[requestId];
            }
    
            res.json(response);
    
        } catch (error) {
            console.error('Get stream response error:', error);
            res.status(500).json({ error: 'Failed to get stream response' });
        }
    },

    getHistory: async (req, res) => {
        try {
            const [messages] = await db.execute(
                'SELECT role, content FROM gbp_messages WHERE conversation_id = ? ORDER BY created_at ASC',
                [req.params.conversationId]
            );

            res.json({
                statusCode: 200,
                result: {
                    history: messages
                }
            });
        } catch (error) {
            console.error('Get GBP history error:', error);
            res.status(500).json({ error: 'Failed to get conversation history' });
        }
    },

    getAllConversations: async (req, res) => {
        try {
            const [conversations] = await db.execute(
                'SELECT id as ConversationId, summary, UNIX_TIMESTAMP(created_at) as CreatedAt ' +
                'FROM gbp_conversations WHERE user_id = ? ORDER BY created_at DESC',
                [req.session.user.id]
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
            console.error('Get GBP conversations error:', error);
            res.status(500).json({ error: 'Failed to get conversations' });
        }
    },

    deleteConversation: async (req, res) => {
        try {
            await db.execute(
                'DELETE FROM gbp_conversations WHERE id = ? AND user_id = ?',
                [req.params.conversationId, req.session.user.id]
            );

            res.json({
                statusCode: 200,
                message: "Conversation deleted successfully"
            });
        } catch (error) {
            console.error('Delete GBP conversation error:', error);
            res.status(500).json({ error: 'Failed to delete conversation' });
        }
    }
};

// Define routes
router.get('/', isAuthenticated, gbpController.renderGBP);
router.post('/conversation/start', isAuthenticated, gbpController.startConversation);
router.post('/message/:conversationId', isAuthenticated, gbpController.sendMessage);
router.get('/stream/:requestId', isAuthenticated, gbpController.getStreamResponse);
router.get('/history/:conversationId/:limit', isAuthenticated, gbpController.getHistory);
router.get('/conversations', isAuthenticated, gbpController.getAllConversations);
router.delete('/conversation/:conversationId', isAuthenticated, gbpController.deleteConversation);

module.exports = router;