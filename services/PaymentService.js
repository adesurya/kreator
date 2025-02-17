const axios = require('axios');
const crypto = require('crypto');
const db = require('../config/database');
require('dotenv').config();

class PaymentService {
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

    constructor() {
        if (PaymentService.instance) {
            return PaymentService.instance;
        }

        const requiredEnvVars = [
            'DUITKU_MERCHANT_CODE',
            'DUITKU_API_KEY',
            'DUITKU_BASE_URL',
            'DUITKU_CALLBACK_URL',
            'DUITKU_RETURN_URL'
        ];

        const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
        if (missingEnvVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
        }

        this.merchantCode = process.env.DUITKU_MERCHANT_CODE;
        this.apiKey = process.env.DUITKU_API_KEY;
        this.baseUrl = process.env.DUITKU_BASE_URL;
        this.callbackUrl = process.env.DUITKU_CALLBACK_URL;
        this.returnUrl = process.env.DUITKU_RETURN_URL;

        // Log configuration (exclude sensitive data)
        console.log('PaymentService initialized with:', {
            merchantCode: this.merchantCode,
            baseUrl: this.baseUrl,
            callbackUrl: this.callbackUrl,
            returnUrl: this.returnUrl
        });

        PaymentService.instance = this;
    }

    async createTransaction(user, plan, paymentMethod) {
        try {
            const merchantOrderId = `ORDER${Date.now()}${Math.random().toString(36).substring(2, 7)}`;
            const amount = Math.round(plan.price); // Ensure amount is integer
            
            const signature = crypto.createHash('md5')
                .update(this.merchantCode + merchantOrderId + amount + this.apiKey)
                .digest('hex');

            const payload = {
                merchantCode: this.merchantCode,
                paymentAmount: amount,
                paymentMethod: paymentMethod,
                merchantOrderId: merchantOrderId,
                productDetails: plan.name,
                customerVaName: user.username,
                email: user.email,
                callbackUrl: this.callbackUrl,
                returnUrl: this.returnUrl,
                signature: signature
            };

            // Log request details
            console.log('Creating payment request:', {
                url: `${this.baseUrl}/api/merchant/v2/inquiry`,
                payload: {
                    ...payload,
                    signature: '***hidden***'
                }
            });

            const response = await axios.post(
                `${this.baseUrl}/api/merchant/v2/inquiry`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000 // 30 seconds timeout
                }
            );

            console.log('Duitku response:', response.data);

            // Store transaction in database
            const [result] = await db.execute(
                `INSERT INTO transactions 
                (user_id, plan_id, merchant_order_id, reference, payment_url, 
                amount, payment_method, status_code, status_message) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    user.id,
                    plan.id,
                    merchantOrderId,
                    response.data.reference || null,
                    response.data.paymentUrl,
                    amount,
                    paymentMethod,
                    response.data.statusCode,
                    response.data.statusMessage || ''
                ]
            );

            return {
                success: true,
                data: {
                    paymentUrl: response.data.paymentUrl,
                    merchantOrderId: merchantOrderId
                }
            };

        } catch (error) {
            // Enhanced error logging
            console.error('Payment creation error:', {
                error: error.message,
                response: error.response?.data,
                status: error.response?.status,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    data: error.config?.data ? JSON.parse(error.config.data) : null
                }
            });

            throw new Error(
                'Failed to create payment: ' + 
                (error.response?.data?.statusMessage || error.message)
            );
        }
    }

    async checkTransactionStatus(merchantOrderId) {
        try {
            // Generate signature for status check
            const signature = crypto.createHash('md5')
                .update(this.merchantCode + merchantOrderId + this.apiKey)
                .digest('hex');

            console.log('Checking transaction status:', {
                merchantOrderId,
                url: `${this.baseUrl}/api/merchant/transactionStatus`
            });

            const response = await axios.post(
                `${this.baseUrl}/api/merchant/transactionStatus`,
                {
                    merchantCode: this.merchantCode,
                    merchantOrderId: merchantOrderId,
                    signature: signature
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('Status check response:', response.data);

            // Update local transaction status
            if (response.data.statusCode === '00' || response.data.statusCode === '01') {
                await db.execute(
                    `UPDATE transactions 
                     SET status = ?, 
                         status_code = ?, 
                         payment_date = CURRENT_TIMESTAMP
                     WHERE merchant_order_id = ?`,
                    [
                        response.data.statusCode === '00' ? 'SUCCESS' : 'FAILED',
                        response.data.statusCode,
                        merchantOrderId
                    ]
                );

                // If payment is successful, handle subscription
                if (response.data.statusCode === '00') {
                    const [transactions] = await db.execute(
                        `SELECT t.*, p.duration 
                         FROM transactions t
                         JOIN plans p ON t.plan_id = p.id
                         WHERE t.merchant_order_id = ?`,
                        [merchantOrderId]
                    );

                    if (transactions.length > 0) {
                        const transaction = transactions[0];

                        // Deactivate existing subscriptions
                        await db.execute(
                            'UPDATE user_subscriptions SET is_active = 0 WHERE user_id = ?',
                            [transaction.user_id]
                        );

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
                    }
                }
            }

            return response.data;

        } catch (error) {
            console.error('Transaction status check error:', error);
            
            // Log detailed error information
            if (error.response) {
                console.error('Error response:', {
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers
                });
            }

            throw new Error(
                error.response?.data?.statusMessage || 
                error.message || 
                'Failed to check transaction status'
            );
        }
    }

    async handleCallback(callbackData) {
        try {
            // Verify signature
            const signature = crypto.createHash('md5')
                .update(callbackData.merchantCode + callbackData.amount + callbackData.merchantOrderId + this.apiKey)
                .digest('hex');

            if (signature !== callbackData.signature) {
                throw new Error('Invalid callback signature');
            }

            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                // Update transaction status
                await connection.execute(
                    `UPDATE transactions 
                    SET status = ?, 
                        status_code = ?, 
                        payment_date = CURRENT_TIMESTAMP
                    WHERE merchant_order_id = ?`,
                    [
                        callbackData.resultCode === '00' ? 'SUCCESS' : 'FAILED',
                        callbackData.resultCode,
                        callbackData.merchantOrderId
                    ]
                );

                // If payment successful, update subscription
                if (callbackData.resultCode === '00') {
                    const [txnRows] = await connection.execute(
                        `SELECT t.user_id, t.plan_id, p.duration 
                         FROM transactions t
                         JOIN plans p ON t.plan_id = p.id
                         WHERE t.merchant_order_id = ?`,
                        [callbackData.merchantOrderId]
                    );

                    if (txnRows.length > 0) {
                        const { user_id, plan_id, duration } = txnRows[0];

                        // Deactivate existing subscriptions
                        await connection.execute(
                            'UPDATE user_subscriptions SET is_active = 0 WHERE user_id = ?',
                            [user_id]
                        );

                        // Create new subscription
                        const startDate = new Date();
                        const endDate = new Date();
                        endDate.setDate(endDate.getDate() + duration);

                        await connection.execute(
                            `INSERT INTO user_subscriptions 
                            (user_id, plan_id, start_date, end_date, is_active) 
                            VALUES (?, ?, ?, ?, 1)`,
                            [user_id, plan_id, startDate, endDate]
                        );
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
        } catch (error) {
            console.error('Callback processing error:', error);
            throw error;
        }
    }

    
}

// Create and export a single instance
const paymentService = new PaymentService();
module.exports = paymentService;