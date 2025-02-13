const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { isAuthenticated } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.get('/', isAuthenticated, async (req, res) => {
    try {
        const [user] = await db.execute(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            [req.session.userId]
        );

        res.render('profile/index', {
            user: req.session.user,
            profile: user[0],
            error: null,
            success: null
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).render('error', { error: 'Failed to load profile' });
    }
});

router.post('/update', isAuthenticated, async (req, res) => {
    try {
        const { username, email } = req.body;

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('profile/index', {
                user: req.session.user,
                profile: { ...req.session.user, username, email },
                error: 'Invalid email format',
                success: null
            });
        }

        // Check if email is already taken by another user
        const [existingUser] = await db.execute(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, req.session.userId]
        );

        if (existingUser.length > 0) {
            return res.render('profile/index', {
                user: req.session.user,
                profile: { ...req.session.user, username, email },
                error: 'Email already in use',
                success: null
            });
        }

        // Update user profile
        await db.execute(
            'UPDATE users SET username = ?, email = ? WHERE id = ?',
            [username, email, req.session.userId]
        );

        // Update session
        req.session.user = {
            ...req.session.user,
            username,
            email
        };

        // Fetch updated user data
        const [updatedUser] = await db.execute(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            [req.session.userId]
        );

        res.render('profile/index', {
            user: req.session.user,
            profile: updatedUser[0],
            error: null,
            success: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).render('profile/index', {
            user: req.session.user,
            profile: req.session.user,
            error: 'Failed to update profile',
            success: null
        });
    }
});

router.post('/change-password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Get user's current password
        const [user] = await db.execute(
            'SELECT password FROM users WHERE id = ?',
            [req.session.userId]
        );

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user[0].password);
        if (!isValidPassword) {
            return res.render('profile/index', {
                user: req.session.user,
                profile: req.session.user,
                error: 'Current password is incorrect',
                success: null
            });
        }

        // Validate new password
        if (newPassword.length < 6) {
            return res.render('profile/index', {
                user: req.session.user,
                profile: req.session.user,
                error: 'New password must be at least 6 characters long',
                success: null
            });
        }

        // Check if passwords match
        if (newPassword !== confirmPassword) {
            return res.render('profile/index', {
                user: req.session.user,
                profile: req.session.user,
                error: 'New passwords do not match',
                success: null
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await db.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, req.session.userId]
        );

        res.render('profile/index', {
            user: req.session.user,
            profile: req.session.user,
            error: null,
            success: 'Password updated successfully'
        });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).render('profile/index', {
            user: req.session.user,
            profile: req.session.user,
            error: 'Failed to change password',
            success: null
        });
    }
});

module.exports = router;