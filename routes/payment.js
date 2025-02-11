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

module.exports = router;