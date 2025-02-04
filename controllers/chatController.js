const axios = require('axios');

const epsillaConfig = {
    apiKey: process.env.EPSILLA_API_KEY,
    namespace: process.env.EPSILLA_NAMESPACE,
    appId: process.env.EPSILLA_APP_ID
};

const chatController = {
    // Render chat interface
    renderChat: (req, res) => {
        res.render('chat/index', { user: req.session.user });
    },

    // Start new conversation
    startConversation: async (req, res) => {
        try {
            const response = await axios.post(
                `https://rag.epsilla.com/conversation/${epsillaConfig.namespace}/${epsillaConfig.appId}/create`,
                { summary: req.body.summary },
                { headers: { 'X-API-Key': epsillaConfig.apiKey } }
            );
            res.json(response.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Send message
    sendMessage: async (req, res) => {
        try {
            const response = await axios.post(
                `https://rag.epsilla.com/chat/${epsillaConfig.namespace}/${epsillaConfig.appId}/${req.params.conversationId}`,
                { message: req.body.message },
                { headers: { 'X-API-Key': epsillaConfig.apiKey } }
            );
            res.json(response.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Get streaming response
    getStreamResponse: async (req, res) => {
        try {
            const response = await axios.get(
                `https://rag.epsilla.com/stream/${epsillaConfig.namespace}/${epsillaConfig.appId}/${req.params.requestId}`,
                { headers: { 'X-API-Key': epsillaConfig.apiKey } }
            );
            res.json(response.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Get conversation history
    getHistory: async (req, res) => {
        try {
            const response = await axios.get(
                `https://rag.epsilla.com/conversation/${epsillaConfig.namespace}/${epsillaConfig.appId}/${req.params.conversationId}/${req.params.limit}`,
                { headers: { 'X-API-Key': epsillaConfig.apiKey } }
            );
            res.json(response.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Get all conversations
    getAllConversations: async (req, res) => {
        try {
            const response = await axios.get(
                `https://rag.epsilla.com/conversations/${epsillaConfig.namespace}/${epsillaConfig.appId}`,
                { headers: { 'X-API-Key': epsillaConfig.apiKey } }
            );
            res.json(response.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Delete conversation
    deleteConversation: async (req, res) => {
        try {
            const response = await axios.delete(
                `https://rag.epsilla.com/conversation/${epsillaConfig.namespace}/${epsillaConfig.appId}/${req.params.conversationId}`,
                { headers: { 'X-API-Key': epsillaConfig.apiKey } }
            );
            res.json(response.data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = chatController;