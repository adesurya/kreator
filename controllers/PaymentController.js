// controllers/PaymentController.js
const PaymentService = require('../services/PaymentService');
const db = require('../config/database');

const paymentController = {
    // Render payment page with available plans
    renderPaymentPage: async (req, res) => {
        try {
            const [plans] = await db.execute(
                'SELECT * FROM plans WHERE is_active = true ORDER BY price ASC'
            );

            res.render('payment/index', {
                plans: plans,
                paymentMethods: PaymentService.PAYMENT_METHODS,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading payment page:', error);
            res.status(500).render('error', { error: 'Failed to load payment page' });
        }
    },

    // Create new payment transaction
    createPayment: async (req, res) => {
        try {
            const { planId, paymentMethod } = req.body;

            // Get plan details
            const [plans] = await db.execute(
                'SELECT * FROM plans WHERE id = ? AND is_active = true',
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
    },

    // Handle payment callback from Duitku
    handleCallback: async (req, res) => {
        try {
            const paymentService = new PaymentService();
            await paymentService.handleCallback(req.body);
            res.json({ success: true });
        } catch (error) {
            console.error('Callback error:', error);
            res.status(500).json({ error: 'Failed to process callback' });
        }
    },

    // Check transaction status
    checkStatus: async (req, res) => {
        try {
            const { merchantOrderId } = req.body;
            const paymentService = new PaymentService();
            const status = await paymentService.checkTransactionStatus(merchantOrderId);
            res.json(status);
        } catch (error) {
            console.error('Status check error:', error);
            res.status(500).json({ error: 'Failed to check status' });
        }
    },

    // List transactions (admin only)
    listTransactions: async (req, res) => {
        try {
            const [transactions] = await db.execute(`
                SELECT t.*, 
                       u.username, 
                       u.email,
                       p.name as plan_name 
                FROM transactions t
                JOIN users u ON t.user_id = u.id
                JOIN plans p ON t.plan_id = p.id
                ORDER BY t.created_at DESC
            `);

            if (req.xhr) {
                res.json(transactions);
            } else {
                res.render('admin/transactions', { transactions });
            }
        } catch (error) {
            console.error('Transaction list error:', error);
            res.status(500).json({ error: 'Failed to load transactions' });
        }
    }
};

module.exports = paymentController;