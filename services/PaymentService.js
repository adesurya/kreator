// services/PaymentService.js
const axios = require('axios');
const crypto = require('crypto');
const db = require('../config/database');

class PaymentService {
    constructor() {
        this.merchantCode = process.env.DUITKU_MERCHANT_CODE;
        this.apiKey = process.env.DUITKU_API_KEY;
        this.baseUrl = process.env.DUITKU_BASE_URL;
        this.callbackUrl = process.env.DUITKU_CALLBACK_URL;
        this.returnUrl = process.env.DUITKU_RETURN_URL;
    }

    // Available payment methods
    static PAYMENT_METHODS = {
        BC: 'BCA Virtual Account',
        M2: 'Mandiri Virtual Account',
        VA: 'Maybank Virtual Account',
        B1: 'CIMB Virtual Account',
        BT: 'Permata Virtual Account',
        OV: 'OVO',
        DA: 'DANA',
        SP: 'ShopeePay QRIS'
    };

    generateMerchantOrderId() {
        return `ORDER${Date.now()}${Math.random().toString(36).substring(2, 7)}`;
    }

    generateSignature(merchantOrderId, amount) {
        return crypto.createHash('md5')
            .update(this.merchantCode + merchantOrderId + amount + this.apiKey)
            .digest('hex');
    }

    async createTransaction(user, plan, paymentMethod) {
        const merchantOrderId = this.generateMerchantOrderId();
        const signature = this.generateSignature(merchantOrderId, plan.price);

        const payload = {
            merchantCode: this.merchantCode,
            paymentAmount: plan.price,
            paymentMethod: paymentMethod,
            merchantOrderId: merchantOrderId,
            productDetails: plan.name,
            email: user.email,
            customerVaName: user.username,
            callbackUrl: this.callbackUrl,
            returnUrl: this.returnUrl,
            expiryPeriod: 60, // 1 hour expiry
            signature: signature
        };

        try {
            const response = await axios.post(
                `${this.baseUrl}/v2/inquiry`,
                payload
            );

            // Store transaction in database
            const [result] = await db.execute(
                `INSERT INTO transactions 
                (user_id, plan_id, merchant_order_id, reference, payment_url, 
                va_number, qr_string, amount, payment_method, status_code, 
                status_message) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    user.id,
                    plan.id,
                    merchantOrderId,
                    response.data.reference,
                    response.data.paymentUrl,
                    response.data.vaNumber || null,
                    response.data.qrString || null,
                    plan.price,
                    paymentMethod,
                    response.data.statusCode,
                    response.data.statusMessage
                ]
            );

            return {
                success: response.data.statusCode === '00',
                data: response.data,
                transactionId: result.insertId
            };
        } catch (error) {
            console.error('Payment creation error:', error);
            throw new Error('Failed to create payment');
        }
    }

    async handleCallback(callbackData) {
        // Verify signature
        const signature = crypto.createHash('md5')
            .update(callbackData.merchantCode + callbackData.amount + callbackData.merchantOrderId + this.apiKey)
            .digest('hex');

        if (signature !== callbackData.signature) {
            throw new Error('Invalid signature');
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Update transaction
            await connection.execute(
                `UPDATE transactions 
                SET status = ?, 
                    status_code = ?, 
                    payment_date = CURRENT_TIMESTAMP,
                    settlement_date = ?,
                    publisher_order_id = ?,
                    issuer_code = ?
                WHERE merchant_order_id = ?`,
                [
                    callbackData.resultCode === '00' ? 'SUCCESS' : 'FAILED',
                    callbackData.resultCode,
                    callbackData.settlementDate || null,
                    callbackData.publisherOrderId || null,
                    callbackData.issuerCode || null,
                    callbackData.merchantOrderId
                ]
            );

            // If payment successful, create subscription
            if (callbackData.resultCode === '00') {
                const [txnRows] = await connection.execute(
                    'SELECT user_id, plan_id FROM transactions WHERE merchant_order_id = ?',
                    [callbackData.merchantOrderId]
                );

                if (txnRows.length > 0) {
                    const [planRows] = await connection.execute(
                        'SELECT duration FROM plans WHERE id = ?',
                        [txnRows[0].plan_id]
                    );

                    if (planRows.length > 0) {
                        const startDate = new Date();
                        const endDate = new Date();
                        endDate.setDate(endDate.getDate() + planRows[0].duration);

                        await connection.execute(
                            `INSERT INTO user_subscriptions 
                            (user_id, plan_id, start_date, end_date, is_active) 
                            VALUES (?, ?, ?, ?, 1)`,
                            [txnRows[0].user_id, txnRows[0].plan_id, startDate, endDate]
                        );

                        // Deactivate any existing subscriptions
                        await connection.execute(
                            `UPDATE user_subscriptions 
                             SET is_active = 0 
                             WHERE user_id = ? 
                             AND id != LAST_INSERT_ID()`,
                            [txnRows[0].user_id]
                        );
                    }
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async checkTransactionStatus(merchantOrderId) {
        const signature = crypto.createHash('md5')
            .update(this.merchantCode + merchantOrderId + this.apiKey)
            .digest('hex');

        try {
            const response = await axios.post(
                `${this.baseUrl}/v2/transactionStatus`,
                {
                    merchantCode: this.merchantCode,
                    merchantOrderId: merchantOrderId,
                    signature: signature
                }
            );

            // Update local transaction status if needed
            if (response.data.statusCode === '00' || response.data.statusCode === '01') {
                await db.execute(
                    `UPDATE transactions 
                     SET status = ?, status_code = ?, payment_date = CURRENT_TIMESTAMP 
                     WHERE merchant_order_id = ?`,
                    [
                        response.data.statusCode === '00' ? 'SUCCESS' : 'FAILED',
                        response.data.statusCode,
                        merchantOrderId
                    ]
                );
            }

            return response.data;
        } catch (error) {
            console.error('Transaction status check error:', error);
            throw new Error('Failed to check transaction status');
        }
    }

    async getUserActiveSubscription(userId) {
        try {
            const [subscriptions] = await db.execute(
                `SELECT s.*, p.name as plan_name, p.price, p.duration
                 FROM user_subscriptions s
                 JOIN plans p ON s.plan_id = p.id
                 WHERE s.user_id = ? 
                 AND s.is_active = 1 
                 AND s.end_date > CURRENT_TIMESTAMP
                 ORDER BY s.end_date DESC
                 LIMIT 1`,
                [userId]
            );

            return subscriptions[0] || null;
        } catch (error) {
            console.error('Error getting user subscription:', error);
            throw new Error('Failed to get user subscription');
        }
    }
}