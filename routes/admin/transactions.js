// routes/admin/transactions.js
const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const paymentService = require('../../services/PaymentService');
const { isAdmin } = require('../../middleware/auth');

// List all transactions
router.get('/', isAdmin, async (req, res) => {
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

        res.render('admin/transactions', { 
            transactions,
            user: req.session.user
        });
    } catch (error) {
        console.error('Transaction list error:', error);
        res.status(500).json({ error: 'Failed to load transactions' });
    }
});

// Check transaction status
router.post('/check-status', isAdmin, async (req, res) => {
    try {
        const { merchantOrderId } = req.body;
        const status = await paymentService.checkTransactionStatus(merchantOrderId);
        
        // Update local transaction status
        if (status.statusCode === '00' || status.statusCode === '01') {
            await db.execute(
                `UPDATE transactions 
                 SET status = ?, 
                     status_code = ?, 
                     payment_date = CURRENT_TIMESTAMP
                 WHERE merchant_order_id = ?`,
                [
                    status.statusCode === '00' ? 'SUCCESS' : 'FAILED',
                    status.statusCode,
                    merchantOrderId
                ]
            );
        }

        res.json(status);
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
});

module.exports = router;