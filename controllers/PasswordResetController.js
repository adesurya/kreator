// controllers/PasswordResetController.js
const crypto = require('crypto');
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const EmailService = require('../services/EmailService');

const generateToken = () => crypto.randomBytes(32).toString('hex');

const PasswordResetController = {
    // Render form untuk request reset password
    showForgotForm: (req, res) => {
        res.render('auth/forgot-password', { 
            error: null,
            success: null,
            user: null
        });
    },

    // Handle request reset password
    handleForgotPassword: async (req, res) => {
        const { email } = req.body;

        try {
            // Check if email exists
            const [users] = await db.execute(
                'SELECT id, email FROM users WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                return res.render('auth/forgot-password', {
                    error: 'No account found with that email address.',
                    success: null,
                    user: null
                });
            }

            const user = users[0];
            const token = generateToken();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

            // Save reset token
            await db.execute(
                'INSERT INTO password_resets (user_id, email, token, expires_at) VALUES (?, ?, ?, ?)',
                [user.id, email, token, expiresAt]
            );

            // Send reset email
            await EmailService.sendPasswordResetEmail(email, token);

            res.render('auth/forgot-password', {
                error: null,
                success: 'Password reset instructions have been sent to your email.',
                user: null
            });

        } catch (error) {
            console.error('Password reset error:', error);
            res.render('auth/forgot-password', {
                error: 'Failed to process password reset request.',
                success: null,
                user: null
            });
        }
    },

    // Render form untuk reset password
    showResetForm: async (req, res) => {
        const { token } = req.params;

        try {
            // Check if token is valid and not expired
            const [resets] = await db.execute(
                `SELECT * FROM password_resets 
                 WHERE token = ? 
                 AND used = FALSE 
                 AND expires_at > CURRENT_TIMESTAMP()`,
                [token]
            );

            if (resets.length === 0) {
                return res.render('auth/reset-password', {
                    error: 'Invalid or expired password reset link.',
                    token: null,
                    user: null
                });
            }

            res.render('auth/reset-password', {
                error: null,
                token,
                user: null
            });

        } catch (error) {
            console.error('Show reset form error:', error);
            res.render('auth/reset-password', {
                error: 'Failed to process password reset.',
                token: null,
                user: null
            });
        }
    },

    // Handle password reset
    handleReset: async (req, res) => {
        const { token } = req.params;
        const { password, password_confirmation } = req.body;

        try {
            // Validate password
            if (password !== password_confirmation) {
                return res.render('auth/reset-password', {
                    error: 'Passwords do not match.',
                    token,
                    user: null
                });
            }

            if (password.length < 8) {
                return res.render('auth/reset-password', {
                    error: 'Password must be at least 8 characters long.',
                    token,
                    user: null
                });
            }

            // Get reset record
            const [resets] = await db.execute(
                `SELECT * FROM password_resets 
                 WHERE token = ? 
                 AND used = FALSE 
                 AND expires_at > CURRENT_TIMESTAMP()`,
                [token]
            );

            if (resets.length === 0) {
                return res.render('auth/reset-password', {
                    error: 'Invalid or expired password reset link.',
                    token: null,
                    user: null
                });
            }

            const reset = resets[0];

            // Update password
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.execute(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, reset.user_id]
            );

            // Mark reset token as used
            await db.execute(
                'UPDATE password_resets SET used = TRUE WHERE id = ?',
                [reset.id]
            );

            // Store success message in session and redirect
            req.session.successMessage = 'Your password has been reset successfully. Please login with your new password.';

            // Redirect to login with success message
            res.redirect('/auth/login');

        } catch (error) {
            console.error('Password reset error:', error);
            res.render('auth/reset-password', {
                error: 'Failed to reset password. Please try again.',
                token,
                user: null
            });
        }
    },

    // Show the reset password form
    showResetForm: async (req, res) => {
        const { token } = req.params;

        try {
            // Check if token is valid and not expired
            const [resets] = await db.execute(
                `SELECT * FROM password_resets 
                 WHERE token = ? 
                 AND used = FALSE 
                 AND expires_at > CURRENT_TIMESTAMP()`,
                [token]
            );

            if (resets.length === 0) {
                return res.render('auth/reset-password', {
                    error: 'Invalid or expired password reset link.',
                    token: null,
                    user: null
                });
            }

            res.render('auth/reset-password', {
                token,
                user: null,
                success: req.session.successMessage,
                error: null
            });

            // Clear success message after displaying
            delete req.session.successMessage;

        } catch (error) {
            console.error('Show reset form error:', error);
            res.render('auth/reset-password', {
                error: 'Failed to load reset password form.',
                token: null,
                user: null
            });
        }
    }
};

module.exports = PasswordResetController;