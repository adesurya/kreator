const isAuthenticated = (req, res, next) => {
    console.log('Session check:', req.session); // Debug log
    
    if (req.session && req.session.userId) {
        return next();
    }
    
    // Store intended URL
    req.session.returnTo = req.originalUrl;
    res.redirect('/auth/login');
};

const isAdmin = (req, res, next) => {
    console.log('Admin check:', {
        session: req.session,
        user: req.session?.user,
        role: req.session?.user?.role
    });

    if (!req.session || !req.session.user) {
        console.log('No session or user');
        return res.redirect('/auth/login');
    }

    if (req.session.user.role !== 'admin') {
        console.log('User is not admin');
        return res.redirect('/dashboard');
    }

    console.log('Admin access granted');
    next();
};

const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }
        return res.redirect('/dashboard');
    }
    next();
};

module.exports = { 
    isAuthenticated, 
    isAdmin,
    redirectIfAuthenticated 
};