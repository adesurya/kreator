// routes/transcribe.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Konfigurasi multer untuk upload file
// Batasan ukuran file bisa disesuaikan di maxFileSize
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Max file size dan durasi bisa diubah disini
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // List format file yang diizinkan
        const allowedMimeTypes = [
            'audio/mpeg',      // mp3, mpga
            'audio/mp4',       // m4a
            'video/mp4',       // mp4
            'audio/wav',       // wav
            'audio/webm',      // webm audio
            'video/webm',      // webm video
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Allowed formats: mp3, mp4, mpeg, mpga, m4a, wav, and webm'));
        }
    },
    limits: {
        fileSize: 25 * 1024 * 1024 // 25MB limit
    }
});

const transcribeController = {
    renderTranscribe: async (req, res) => {
        try {
            // Fetch transcription history
            const [history] = await db.execute(
                `SELECT id, filename, transcription, created_at 
                 FROM transcriptions 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC`,
                [req.session.userId]
            );

            res.render('transcribe/index', {
                history: history,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading transcribe page:', error);
            res.status(500).send('Failed to load transcribe page');
        }
    },

    transcribeAudio: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const formData = new FormData();
            formData.append('file', fs.createReadStream(req.file.path));
            formData.append('model', 'whisper-1');

            const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', 
                formData, 
                {
                    headers: {
                        ...formData.getHeaders(),
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                    }
                }
            );

            // Save to database
            const [result] = await db.execute(
                'INSERT INTO transcriptions (user_id, filename, transcription) VALUES (?, ?, ?)',
                [req.session.userId, req.file.originalname, response.data.text]
            );

            // Delete uploaded file
            fs.unlinkSync(req.file.path);

            res.json({
                success: true,
                transcription: response.data.text,
                id: result.insertId
            });

        } catch (error) {
            console.error('Transcription error:', error);
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ error: 'Failed to transcribe audio' });
        }
    },

    deleteHistory: async (req, res) => {
        try {
            await db.execute(
                'DELETE FROM transcriptions WHERE id = ? AND user_id = ?',
                [req.params.id, req.session.userId]
            );
            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting history:', error);
            res.status(500).json({ error: 'Failed to delete history' });
        }
    }
};

router.get('/', isAuthenticated, transcribeController.renderTranscribe);
router.post('/upload', isAuthenticated, upload.single('audio'), transcribeController.transcribeAudio);
router.delete('/history/:id', isAuthenticated, transcribeController.deleteHistory);

module.exports = router;