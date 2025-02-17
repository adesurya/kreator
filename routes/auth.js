const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const PasswordResetController = require('../controllers/PasswordResetController');

// Controllers
const authController = {
    getLogin: (req, res) => {
        if (req.session && req.session.userId) {
            if (req.session.user.role === 'admin') {
                return res.redirect('/admin/dashboard');
            }
            return res.redirect('/dashboard');
        }
        res.render('auth/login', { 
            error: null,
            style: '',
            script: '',
            user: null
        });
    },

    postLogin: async (req, res) => {
        try {
            const { email, password } = req.body;
            
            // Query user dari database
            const [users] = await db.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            
            const user = users[0];
            console.log('Login attempt:', { email, userFound: !!user });

            if (!user) {
                return res.render('auth/login', { 
                    error: 'Invalid email or password',
                    style: '',
                    script: '',
                    user: null
                });
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            console.log('Password verification:', { isValid: isValidPassword });

            if (!isValidPassword) {
                return res.render('auth/login', { 
                    error: 'Invalid email or password',
                    style: '',
                    script: '',
                    user: null
                });
            }

            req.session.userId = user.id;
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            };
            
            console.log('Session set:', req.session);

            if (user.role === 'admin') {
                return res.redirect('/admin/dashboard');
            } else {
                return res.redirect('/dashboard');
            }

        } catch (error) {
            console.error('Login error:', error);
            return res.render('auth/login', { 
                error: 'Login failed. Please try again.',
                style: '',
                script: '',
                user: null
            });
        }
    },

    getRegister: (req, res) => {
        if (req.session && req.session.userId) {
            return res.redirect('/dashboard');
        }
        res.render('auth/register', { 
            error: null,
            style: '',
            script: '',
            user: null
        });
    },

    postRegister: async (req, res) => {
        try {
            const { username, email, password } = req.body;
            const hashedPassword = await bcrypt.hash(password, 10);
            
            await db.execute(
                'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                [username, email, hashedPassword, 'user']
            );
            
            res.redirect('/auth/login');
        } catch (error) {
            console.error('Registration error:', error);
            res.render('auth/register', { 
                error: 'Registration failed. Please try again.',
                style: '',
                script: '',
                user: null
            });
        }
    },

    logout: async (req, res) => {
        try {
            // Destroy the session
            await new Promise((resolve, reject) => {
                req.session.destroy((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Clear session cookie
            res.clearCookie('connect.sid');
            
            // Redirect to landing page
            return res.redirect('/');
            
        } catch (error) {
            console.error('Logout error:', error);
            return res.redirect('/');
        }
    }
};

// Routes
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.get('/register', authController.getRegister);
router.post('/register', authController.postRegister);
router.get('/logout', authController.logout);

// Password Reset Routes
router.get('/forgot-password', PasswordResetController.showForgotForm);
router.post('/forgot-password', PasswordResetController.handleForgotPassword);
router.get('/reset-password/:token', PasswordResetController.showResetForm);
router.post('/reset-password/:token', PasswordResetController.handleReset);


module.exports = router;