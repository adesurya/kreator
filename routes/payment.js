// routes/payment.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/PaymentController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.get('/plans', isAuthenticated, paymentController.renderPaymentPage);
router.post('/create', isAuthenticated, paymentController.createPayment);
router.post('/callback', paymentController.handleCallback);
router.get('/transactions', isAdmin, paymentController.listTransactions);
router.post('/check-status', isAdmin, paymentController.checkStatus);


app.post('/payment/create', isAuthenticated, async (req, res) => {
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

        const paymentService = new PaymentService();
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


app.post('/payment/callback', async (req, res) => {
    try {
        const paymentService = new PaymentService();
        await paymentService.handleCallback(req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Callback error:', error);
        res.status(500).json({ error: 'Failed to process callback' });
    }
});

app.get('/payment/return', isAuthenticated, async (req, res) => {
    const { merchantOrderId } = req.query;
    
    try {
        const paymentService = new PaymentService();
        const status = await paymentService.checkTransactionStatus(merchantOrderId);

        res.render('payment/return', {
            user: req.session.user,
            merchantOrderId,
            reference: status.reference,
            resultCode: status.statusCode
        });
    } catch (error) {
        console.error('Return page error:', error);
        res.redirect('/pricing');
    }
});

app.use('/pricing', isAuthenticated, async (req, res) => {
    try {
        // Get current subscription
        const [currentSubscription] = await db.execute(
            `SELECT s.*, p.name as plan_name, p.price, p.duration
             FROM user_subscriptions s
             JOIN plans p ON s.plan_id = p.id
             WHERE s.user_id = ? 
             AND s.is_active = true 
             AND s.end_date > CURRENT_TIMESTAMP()
             ORDER BY s.end_date DESC
             LIMIT 1`,
            [req.session.userId]
        );

        // Get all active plans
        const [plans] = await db.execute(
            'SELECT * FROM plans WHERE is_active = 1 ORDER BY price ASC'
        );

        res.render('pricing/index', {
            user: req.session.user,
            plans: plans,
            currentSubscription: currentSubscription[0] || null,
            paymentMethods: PaymentService.PAYMENT_METHODS
        });
    } catch (error) {
        console.error('Error loading plans:', error);
        res.status(500).render('error', { 
            error: 'Failed to load plans',
            user: req.session.user
        });
    }
});
module.exports = router;