const roleCheck = {
    isAdmin: (req, res, next) => {
        if (req.session.user && req.session.user.role === 'admin') {
            next();
        } else {
            res.status(403).redirect('/login');
        }
    },

    hasAccess: (menuName) => {
        return async (req, res, next) => {
            try {
                const [rows] = await db.execute(
                    'SELECT * FROM menu_access WHERE user_id = ? AND menu_name = ?',
                    [req.session.userId, menuName]
                );
                if (rows.length > 0 || req.session.user.role === 'admin') {
                    next();
                } else {
                    res.status(403).send('Access denied');
                }
            } catch (error) {
                res.status(500).send('Error checking access');
            }
        };
    }
};

module.exports = roleCheck;