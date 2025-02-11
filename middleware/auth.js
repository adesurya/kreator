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
    // Check if user is logged in
    if (!req.session || !req.session.user) {
        if (req.xhr) {
            return res.status(401).json({ error: 'Please login first' });
        }
        return res.redirect('/auth/login');
    }

    // Check if user has admin role
    if (req.session.user.role !== 'admin') {
        if (req.xhr) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        return res.redirect('/dashboard');
    }

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