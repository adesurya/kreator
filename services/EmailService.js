// services/EmailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
    constructor() {
                // Validate required environment variables
                const requiredEnvVars = [
                    'SMTP_HOST',
                    'SMTP_PORT',
                    'SMTP_USER',
                    'SMTP_PASS',
                    'MAIL_FROM_NAME',
                    'MAIL_FROM_ADDRESS',
                    'APP_URL'
                ];
                const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
                if (missingEnvVars.length > 0) {
                    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
                }
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true', // true untuk port 465, false untuk port lain
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        this.appUrl = process.env.APP_URL.replace(/\/$/, ''); // Remove trailing slash if exists

    }

    async sendPasswordResetEmail(email, resetToken) {
        const resetLink = `${this.appUrl}/auth/reset-password/${resetToken}`;
        
        const mailOptions = {
            from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
            to: email,
            subject: 'Reset Your Password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2d3748; margin-bottom: 20px;">Reset Your Password</h2>
                    <p style="color: #4a5568; margin-bottom: 20px;">You have requested to reset your password. Click the button below to set a new password:</p>
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${resetLink}" 
                           style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p style="color: #718096; margin-bottom: 10px;">This link will expire in 24 hours.</p>
                    <p style="color: #718096; margin-bottom: 20px;">If you didn't request this, you can safely ignore this email.</p>
                    
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
                        <p style="color: #a0aec0; font-size: 12px;">
                            If the button above doesn't work, copy and paste this link into your browser:<br>
                            <a href="${resetLink}" style="color: #4299e1;">${resetLink}</a>
                        </p>
                    </div>
                </div>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Password reset email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('Error sending password reset email:', error);
            throw error;
        }
    }
    async sendPasswordChangedEmail(email) {
        const loginLink = `${this.appUrl}/auth/login`;
        
        const mailOptions = {
            from: `"${process.env.MAIL_FROM_NAME}" <${process.env.MAIL_FROM_ADDRESS}>`,
            to: email,
            subject: 'Your Password Has Been Changed',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2d3748; margin-bottom: 20px;">Password Changed Successfully</h2>
                    <p style="color: #4a5568; margin-bottom: 20px;">Your password has been successfully changed. You can now login with your new password.</p>
                    
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${loginLink}" 
                           style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Login to Your Account
                        </a>
                    </div>
                    
                    <p style="color: #718096; margin-bottom: 20px;">If you did not change your password, please contact our support team immediately.</p>
                    
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 20px;">
                        <p style="color: #a0aec0; font-size: 12px;">
                            If the button above doesn't work, copy and paste this link into your browser:<br>
                            <a href="${loginLink}" style="color: #4299e1;">${loginLink}</a>
                        </p>
                    </div>
                </div>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Password changed notification email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('Error sending password changed email:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();