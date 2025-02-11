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
    console.log('Admin check:', req.session); // Debug log
    
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    
    res.redirect('/auth/login');
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