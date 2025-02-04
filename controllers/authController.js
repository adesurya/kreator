const User = require('../models/user');

const authController = {
    getLogin: (req, res) => {
        res.render('auth/login', { error: null });
    },

    postLogin: async (req, res) => {
        try {
            const { email, password } = req.body;
            const user = await User.findByEmail(email);

            if (!user || !(await User.verifyPassword(password, user.password))) {
                return res.render('auth/login', { error: 'Invalid credentials' });
            }

            req.session.userId = user.id;
            req.session.user = {
                id: user.id,
                username: user.username,
                role: user.role
            };

            if (user.role === 'admin') {
                res.redirect('/admin/dashboard');
            } else {
                res.redirect('/chat');
            }
        } catch (error) {
            res.render('auth/login', { error: 'Login failed' });
        }
    },

    getRegister: (req, res) => {
        res.render('auth/register', { error: null });
    },

    postRegister: async (req, res) => {
        try {
            const { username, email, password } = req.body;
            await User.create({ username, email, password });
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

module.exports = authController;