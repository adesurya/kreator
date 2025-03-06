const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');

// Configure multer for image upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../public/uploads/background-remove');
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
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
});

const backgroundRemoveController = {
    renderPage: async (req, res) => {
        try {
            const [history] = await db.execute(
                `SELECT id, original_image, result_image, created_at 
                 FROM background_removes 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 50`,
                [req.session.userId]
            );

            res.render('backgroundRemove/index', {
                history: history,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading background remove page:', error);
            res.status(500).render('error', { error: 'Failed to load page' });
        }
    },

    removeBackground: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No image uploaded' });
            }

            // Read image file and convert to base64
            const imageBuffer = fs.readFileSync(req.file.path);
            const base64Image = imageBuffer.toString('base64');

            // Prepare request for Runware API
            const requestBody = [
                {
                    taskType: "authentication",
                    apiKey: process.env.RUNWARE_API_KEY
                },
                {
                    taskType: "imageBackgroundRemoval",
                    taskUUID: uuidv4(),
                    inputImage: base64Image,
                    outputType: "URL",
                    outputFormat: "PNG",
                    rgba: [255, 255, 255, 0],
                    postProcessMask: true,
                    returnOnlyMask: false,
                    alphaMatting: true,
                    alphaMattingForegroundThreshold: 240,
                    alphaMattingBackgroundThreshold: 10,
                    alphaMattingErodeSize: 10
                }
            ];

            // Call Runware API
            const response = await axios.post('https://api.runware.ai/v1', 
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Get processed image URL
            const processedImageUrl = response.data.data[0].imageURL;

            // Download processed image
            const processedImageResponse = await axios.get(processedImageUrl, { 
                responseType: 'arraybuffer' 
            });
            
            // Generate unique filename for processed image
            const processedFilename = `processed_${uuidv4()}${path.extname(req.file.originalname)}`;
            const processedLocalPath = path.join(req.file.destination, processedFilename);
            
            // Save processed image locally
            fs.writeFileSync(processedLocalPath, Buffer.from(processedImageResponse.data));

            // Generate public paths
            const originalPublicPath = `/uploads/background-remove/${path.basename(req.file.path)}`;
            const processedPublicPath = `/uploads/background-remove/${processedFilename}`;

            // Save to database
            const [result] = await db.execute(
                'INSERT INTO background_removes (user_id, original_image, result_image, created_at) VALUES (?, ?, ?, NOW())',
                [req.session.userId, originalPublicPath, processedPublicPath]
            );

            res.json({
                success: true,
                originalImage: originalPublicPath,
                processedImage: processedPublicPath,
                id: result.insertId
            });

        } catch (error) {
            console.error('Background removal error:', error);
            res.status(500).json({ error: 'Failed to remove background' });
        }
    },

    deleteHistory: async (req, res) => {
        try {
            const [rows] = await db.execute(
                'SELECT original_image, result_image FROM background_removes WHERE id = ? AND user_id = ?',
                [req.params.id, req.session.userId]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: 'Image not found' });
            }

            // Delete image files
            const basePath = path.join(__dirname, '../public');
            fs.unlinkSync(path.join(basePath, rows[0].original_image));
            fs.unlinkSync(path.join(basePath, rows[0].result_image));

            // Delete database record
            await db.execute(
                'DELETE FROM background_removes WHERE id = ?',
                [req.params.id]
            );

            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting history:', error);
            res.status(500).json({ error: 'Failed to delete history' });
        }
    }
};

router.get('/', isAuthenticated, backgroundRemoveController.renderPage);
router.post('/remove', isAuthenticated, upload.single('image'), backgroundRemoveController.removeBackground);
router.delete('/history/:id', isAuthenticated, backgroundRemoveController.deleteHistory);

module.exports = router;