const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database'); // pastikan path sesuai

const authRoutes = {
    getLogin: (req, res) => {
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
            
            // Debug log
            console.log('Login attempt:', { email, userFound: !!user });

            // Jika user tidak ditemukan
            if (!user) {
                return res.render('auth/login', { 
                    error: 'Invalid email or password',
                    style: '',
                    script: '',
                    user: null
                });
            }

            // Verifikasi password
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            // Debug log
            console.log('Password verification:', { isValid: isValidPassword });

            if (!isValidPassword) {
                return res.render('auth/login', { 
                    error: 'Invalid email or password',
                    style: '',
                    script: '',
                    user: null
                });
            }

            // Set session
            req.session.userId = user.id;
            req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            };

            // Debug log
            console.log('Session set:', req.session);

            // Redirect berdasarkan role
            if (user.role === 'admin') {
                return res.redirect('/admin/dashboard');
            } else {
                return res.redirect('/chat');
            }

        } catch (error) {
            console.error('Login error:', error);
            res.render('auth/login', { 
                error: 'Login failed. Please try again.',
                style: '',
                script: '',
                user: null
            });
        }
    },

    getRegister: (req, res) => {
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
            // Implementasi register logic
            res.redirect('/login');
        } catch (error) {
            res.render('auth/register', { error: 'Registration failed' });
        }
    },

    logout: (req, res) => {
        req.session.destroy();
        res.redirect('/login');
    }
};

// Define routes with handler functions
router.get('/login', authRoutes.getLogin);
router.post('/login', authRoutes.postLogin);
router.get('/register', authRoutes.getRegister);
router.post('/register', authRoutes.postRegister);
router.get('/logout', authRoutes.logout);

module.exports = router;