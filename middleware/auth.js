const isAuthenticated = (req, res, next) => {
    console.log('Session check:', req.session); // Debug log
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

const isAdmin = (req, res, next) => {
    console.log('Admin check:', req.session); // Debug log
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.redirect('/login');
};

module.exports = { isAuthenticated, isAdmin };