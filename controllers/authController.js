const User = require('../models/user');

const postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const [users] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        
        const user = users[0];
        console.log('Login attempt:', { email, userFound: !!user });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.render('auth/login', { 
                error: 'Invalid credentials',
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

        // Check subscription status after successful login
        if (user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }

        const [subscriptions] = await db.execute(
            `SELECT * FROM user_subscriptions 
             WHERE user_id = ? 
             AND is_active = true 
             AND end_date > CURRENT_TIMESTAMP()`,
            [user.id]
        );

        if (subscriptions.length === 0) {
            return res.redirect('/pricing');
        }

        return res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        res.render('auth/login', { 
            error: 'Login failed',
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
            const [users] = await db.execute(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );
            
            const user = users[0];
            console.log('Login attempt:', { email, userFound: !!user }); // Debug log
    
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.render('auth/login', { 
                    error: 'Invalid credentials',
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
    
            console.log('Session set:', req.session); // Debug log
    
            if (user.role === 'admin') {
                console.log('Redirecting to admin dashboard'); // Debug log
                return res.redirect('/admin/dashboard');
            } else {
                return res.redirect('/dashboard');
            }
        } catch (error) {
            console.error('Login error:', error);
            res.render('auth/login', { 
                error: 'Login failed',
                style: '',
                script: '',
                user: null
            });
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