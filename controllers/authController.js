const User = require('../models/user');

const postLogin = async (req, res) => {
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

        // Redirect berdasarkan role dengan return
        if (user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        } else {
            return res.redirect('/dashboard');
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
};

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
                res.redirect('/dashboard');
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