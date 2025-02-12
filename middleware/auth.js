// middleware/auth.js
const isAuthenticated = (req, res, next) => {
    console.log('Session check:', req.session); // Debug log
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/auth/login');
};

const isAdmin = (req, res, next) => {
    try {
        console.log('Admin check:', {
            session: req.session,
            user: req.session?.user,
            role: req.session?.user?.role
        });

        if (!req.session || !req.session.user) {
            return res.redirect('/auth/login');
        }

        if (req.session.user.role !== 'admin') {
            return res.redirect('/dashboard');
        }

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).render('error', {
            error: 'Authentication error',
            user: null
        });
    }
};

module.exports = { isAuthenticated, isAdmin };