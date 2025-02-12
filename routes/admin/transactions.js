// routes/admin/transactions.js
const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/PaymentController');

router.get('/', paymentController.listTransactions);
router.post('/check-status', paymentController.checkStatus);

module.exports = router;