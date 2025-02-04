// routes/imageCaption.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/caption');
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Controller methods
const imageCaptionController = {
    renderImageCaption: async (req, res) => {
        try {
            // Get total count of user's images
            const [countResult] = await db.execute(
                'SELECT COUNT(*) as total FROM image_captions WHERE user_id = ?',
                [req.session.userId]
            );
            
            // Get user's history
            const [history] = await db.execute(
                'SELECT image_path, caption, created_at FROM image_captions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
                [req.session.userId]
            );
            
            res.render('imageCaption/index', {
                user: req.session.user,
                style: '',
                script: '',
                totalImages: countResult[0].total,
                history: history
            });
        } catch (error) {
            console.error('Error fetching history:', error);
            res.render('imageCaption/index', {
                user: req.session.user,
                style: '',
                script: '',
                totalImages: 0,
                history: []
            });
        }
    },

    generateCaption: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No image uploaded' });
            }

            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const imageUrl = `${baseUrl}/uploads/caption/${path.basename(req.file.path)}`;

            // Convert image to base64
            const imageBuffer = fs.readFileSync(req.file.path);
            const base64Image = imageBuffer.toString('base64');
            const dataUri = `data:${req.file.mimetype};base64,${base64Image}`;

                            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: "Buatkan caption menarik yang engagement dari gambar berikut"
                                },
                                {
                                    type: "image_url",
                                    image_url: {
                                        url: dataUri,
                                        detail: "low"
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 500
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.data || !response.data.choices || !response.data.choices[0]) {
                throw new Error('Invalid response from OpenAI API');
            }

            // Save to database
            await db.execute(
                'INSERT INTO image_captions (user_id, image_path, caption) VALUES (?, ?, ?)',
                [req.session.userId, path.basename(req.file.path), response.data.choices[0].message.content]
            );

            res.json({
                success: true,
                caption: response.data.choices[0].message.content,
                image: imageUrl
            });

        } catch (error) {
            console.error('Error generating caption:', error.response?.data || error.message);
            res.status(500).json({ 
                error: 'Failed to generate caption', 
                details: error.message 
            });
        }
    }
};

// Define routes
router.get('/', isAuthenticated, imageCaptionController.renderImageCaption);
router.post('/generate', isAuthenticated, upload.single('image'), imageCaptionController.generateCaption);

module.exports = router;