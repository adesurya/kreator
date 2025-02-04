const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ALLOWED_SIZES = ['256x256', '512x512', '1024x1024'];

const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const imageGeneratorController = {
    renderPage: async (req, res) => {
        try {
            // Fetch image history with pagination
            const [history] = await db.execute(
                `SELECT id, prompt, image_url, created_at 
                 FROM image_generations 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 50`,
                [req.session.userId]
            );

            res.render('imageGenerator/index', {
                history: history,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading image generator page:', error);
            res.status(500).send('Failed to load page');
        }
    },

    generateImage: async (req, res) => {
        try {
            // const { prompt, size = "1024x1024" } = req.body;
            const { prompt, size} = req.body;

            // Call OpenAI API
            const response = await axios.post('https://api.openai.com/v1/images/generations', 
                {
                    model: "dall-e-3",
                    prompt: prompt,
                    n: 1,
                    size: size
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Download and save image locally
            const imageUrl = response.data.data[0].url;
            const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(imageResponse.data);
            
            // Generate unique filename
            const filename = `${uuidv4()}.png`;
            const localPath = path.join(uploadsDir, filename);
            
            // Save image to local storage
            fs.writeFileSync(localPath, imageBuffer);
            
            // Save to database with local path
            const publicPath = `/uploads/${filename}`;
            const [result] = await db.execute(
                'INSERT INTO image_generations (user_id, prompt, image_url) VALUES (?, ?, ?)',
                [req.session.userId, prompt, publicPath]
            );

            res.json({
                success: true,
                imageUrl: publicPath,
                id: result.insertId
            });

        } catch (error) {
            console.error('Image generation error:', error);
            res.status(500).json({ error: 'Failed to generate image' });
        }
    },



    deleteHistory: async (req, res) => {
        try {
            // Verify ownership before deleting
            const [rows] = await db.execute(
                'SELECT id FROM image_generations WHERE id = ? AND user_id = ?',
                [req.params.id, req.session.userId]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Image not found' });
            }

            // Delete the record
            await db.execute(
                'DELETE FROM image_generations WHERE id = ?',
                [req.params.id]
            );

            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting history:', error);
            res.status(500).json({ error: 'Failed to delete history' });
        }
    }
};

// Routes
router.get('/', isAuthenticated, imageGeneratorController.renderPage);
router.post('/generate', isAuthenticated, imageGeneratorController.generateImage);
router.delete('/history/:id', isAuthenticated, imageGeneratorController.deleteHistory);

module.exports = router;