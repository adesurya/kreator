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
            expiryPeriod: 10,
            signature: signature
        };

        try {
            const response = await axios.post(
                `${this.baseUrl}/webapi/api/merchant/v2/inquiry`,
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
                    sp_user_hash = ?,
                    issuer_code = ?
                WHERE merchant_order_id = ?`,
                [
                    callbackData.resultCode === '00' ? 'SUCCESS' : 'FAILED',
                    callbackData.resultCode,
                    callbackData.settlementDate || null,
                    callbackData.publisherOrderId || null,
                    callbackData.spUserHash || null,
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
                            (user_id, plan_id, start_date, end_date) 
                            VALUES (?, ?, ?, ?)`,
                            [txnRows[0].user_id, txnRows[0].plan_id, startDate, endDate]
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
                `${this.baseUrl}/webapi/api/merchant/transactionStatus`,
                {
                    merchantCode: this.merchantCode,
                    merchantOrderId: merchantOrderId,
                    signature: signature
                }
            );

            return response.data;
        } catch (error) {
            console.error('Transaction status check error:', error);
            throw new Error('Failed to check transaction status');
        }
    }
}

module.exports = PaymentService;