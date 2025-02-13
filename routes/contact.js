const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
    res.render('contact/index', {
        user: req.session.user,
        error: null,
        success: null
    });
});

router.post('/submit', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('contact/index', {
                user: req.session.user,
                error: 'Invalid email format',
                success: null,
                formData: req.body
            });
        }

        // Store message in database
        await db.execute(
            'INSERT INTO contact_messages (name, email, subject, message, user_id) VALUES (?, ?, ?, ?, ?)',
            [name, email, subject, message, req.session?.userId || null]
        );

        // In a real application, you might want to:
        // 1. Send an email notification to admin
        // 2. Send a confirmation email to user
        // 3. Integrate with a ticketing system

        res.render('contact/index', {
            user: req.session.user,
            error: null,
            success: 'Message sent successfully! We will get back to you soon.',
            formData: null
        });
    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.render('contact/index', {
            user: req.session.user,
            error: 'Failed to send message. Please try again later.',
            success: null,
            formData: req.body
        });
    }
});

module.exports = router;