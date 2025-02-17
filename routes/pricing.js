// routes/pricing.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');
const paymentService = require('../services/PaymentService');

// Load pricing page
router.get('/', isAuthenticated, async (req, res) => {
    try {
        // Get all active plans
        const [plans] = await db.execute(
            'SELECT * FROM plans WHERE is_active = 1 ORDER BY price ASC'
        );

        // Get current subscription if exists
        const [subscriptions] = await db.execute(
            `SELECT s.*, p.name as plan_name 
             FROM user_subscriptions s
             JOIN plans p ON s.plan_id = p.id
             WHERE s.user_id = ? 
             AND s.is_active = true 
             AND s.end_date > CURRENT_TIMESTAMP()
             ORDER BY s.end_date DESC
             LIMIT 1`,
            [req.session.userId]
        );

        res.render('pricing/index', {
            user: req.session.user,
            plans: plans,
            currentSubscription: subscriptions[0] || null,
            paymentMethods: paymentService.constructor.PAYMENT_METHODS
        });
    } catch (error) {
        console.error('Error loading plans:', error);
        res.status(500).render('error', { 
            error: 'Failed to load plans',
            user: req.session.user
        });
    }
});

// Payment creation endpoint
router.post('/payment/create', isAuthenticated, async (req, res) => {
    try {
        const { planId, paymentMethod } = req.body;
        console.log('Request body:', { planId, paymentMethod }); // Debug log

        // Get plan details
        const [plans] = await db.execute(
            'SELECT * FROM plans WHERE id = ? AND is_active = 1',
            [planId]
        );

        if (plans.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        console.log('Found plan:', plans[0]); // Debug log

        // Use the singleton instance
        const result = await paymentService.createTransaction(
            req.session.user,
            plans[0],
            paymentMethod
        );

        console.log('Payment result:', result); // Debug log

        if (result.success) {
            res.json({ 
                success: true, 
                paymentUrl: result.data.paymentUrl 
            });
        } else {
            throw new Error('Payment creation failed');
        }
    } catch (error) {
        console.error('Payment error:', error);
        res.status(500).json({ 
            error: 'Failed to create payment',
            details: error.message 
        });
    }
});

module.exports = router;