// routes/payment.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/PaymentController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const paymentService = require('../services/PaymentService');
const db = require('../config/database');


router.get('/plans', isAuthenticated, paymentController.renderPaymentPage);
router.post('/callback', paymentController.handleCallback);
router.get('/transactions', isAdmin, paymentController.listTransactions);
router.post('/check-status', isAdmin, paymentController.checkStatus);

// Payment creation endpoint
router.post('/create', isAuthenticated, async (req, res) => {
    try {
        const { planId, paymentMethod } = req.body;

        // Get plan details
        const [plans] = await db.execute(
            'SELECT * FROM plans WHERE id = ? AND is_active = 1',
            [planId]
        );

        if (plans.length === 0) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        const result = await paymentService.createTransaction(
            req.session.user,
            plans[0],
            paymentMethod
        );

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
        res.status(500).json({ error: 'Failed to create payment' });
    }
});

// Handle payment return
router.get('/return', async (req, res) => {
    const { merchantOrderId, resultCode, reference } = req.query;
    
    try {
        // Get transaction details
        const [transactions] = await db.execute(
            `SELECT t.*, p.name as plan_name, p.duration
             FROM transactions t
             JOIN plans p ON t.plan_id = p.id
             WHERE t.merchant_order_id = ?`,
            [merchantOrderId]
        );

        if (transactions.length === 0) {
            return res.render('payment/return', {
                success: false,
                error: 'Transaction not found',
                user: req.session.user
            });
        }

        const transaction = transactions[0];

        // If payment is successful
        if (resultCode === '00') {
            try {
                // Get user's current subscription
                const [subscriptions] = await db.execute(
                    `SELECT * FROM user_subscriptions 
                     WHERE user_id = ? AND is_active = 1`,
                    [transaction.user_id]
                );

                // Deactivate current subscription if exists
                if (subscriptions.length > 0) {
                    await db.execute(
                        'UPDATE user_subscriptions SET is_active = 0 WHERE id = ?',
                        [subscriptions[0].id]
                    );
                }

                // Create new subscription
                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + transaction.duration);

                await db.execute(
                    `INSERT INTO user_subscriptions 
                     (user_id, plan_id, start_date, end_date, is_active)
                     VALUES (?, ?, ?, ?, 1)`,
                    [transaction.user_id, transaction.plan_id, startDate, endDate]
                );

                // Update transaction status
                await db.execute(
                    `UPDATE transactions 
                     SET status = 'SUCCESS',
                         status_code = ?,
                         reference = ?,
                         payment_date = CURRENT_TIMESTAMP
                     WHERE merchant_order_id = ?`,
                    [resultCode, reference, merchantOrderId]
                );

                // Get return URL from session or use default
                const returnUrl = req.session.returnTo || '/dashboard';
                delete req.session.returnTo;

                return res.render('payment/return', {
                    success: true,
                    transaction: transaction,
                    reference: reference,
                    returnUrl: returnUrl,
                    user: req.session.user
                });
            } catch (error) {
                console.error('Error processing successful payment:', error);
                return res.render('payment/return', {
                    success: false,
                    error: 'Failed to process payment',
                    user: req.session.user
                });
            }
        } else {
            // Payment failed
            await db.execute(
                `UPDATE transactions 
                 SET status = 'FAILED',
                     status_code = ?,
                     reference = ?
                 WHERE merchant_order_id = ?`,
                [resultCode, reference, merchantOrderId]
            );

            return res.render('payment/return', {
                success: false,
                transaction: transaction,
                reference: reference,
                error: 'Payment was not successful',
                user: req.session.user
            });
        }
    } catch (error) {
        console.error('Payment return error:', error);
        res.render('payment/return', {
            success: false,
            error: 'Error processing payment return',
            user: req.session.user
        });
    }
});

// Handle payment callback from Duitku
router.post('/callback', async (req, res) => {
    try {
        await paymentService.handleCallback(req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Payment callback error:', error);
        res.status(500).json({ error: 'Failed to process payment callback' });
    }
});

module.exports = router;