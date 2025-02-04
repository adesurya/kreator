// controllers/documentResumeController.js
const OpenAI = require('openai');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const documentResume = require('../models/documentResume');

const openaiConfig = {
    apiKey: process.env.OPENAI_API_KEY
};

const documentResumeController = {
    // Render document resume interface
    renderDocumentResume: (req, res) => {
        res.render('document-resume/index', { user: req.session.user });
    },

    // Handle document summarization
    summarizeDocument: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            let text = '';
            const filePath = req.file.path;
            
            // Extract text based on file type
            if (req.file.mimetype === 'application/pdf') {
                const dataBuffer = fs.readFileSync(filePath);
                const pdfData = await pdf(dataBuffer);
                text = pdfData.text;
            } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const result = await mammoth.extractRawText({ path: filePath });
                text = result.value;
            }

            const openai = new OpenAI(openaiConfig);
            const completion = await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that summarizes documents. Always provide the summary in Indonesian language."
                    },
                    {
                        role: "user",
                        content: `Please summarize the following text: ${text}`
                    }
                ],
            });

            const summary = completion.choices[0].message.content;

            // Save to history
            await documentResume.create({
                userId: req.session.user.id,
                originalFileName: req.file.originalname,
                summary: summary
            });

            // Clean up uploaded file
            fs.unlinkSync(filePath);

            res.json({ data: { summary } });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Get document summaries history
    getHistory: async (req, res) => {
        try {
            const histories = await documentResume.getHistories(req.session.user.id);
            res.json({ data: histories });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Delete document summary history
    deleteHistory: async (req, res) => {
        try {
            const success = await documentResume.deleteHistory(req.params.id, req.session.user.id);
            if (!success) {
                return res.status(404).json({ error: 'History not found' });
            }
            res.json({ message: 'History deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = documentResumeController;