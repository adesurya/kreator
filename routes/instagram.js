// routes/instagram.js
const express = require('express');
const router = express.Router();
const instagramController = require('../controllers/InstagramController');
const { isAuthenticated } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/instagramRateLimit');

// Dashboard route
router.get('/dashboard', isAuthenticated, instagramController.renderDashboard);

// Account management
router.post('/account/add', isAuthenticated, apiLimiter, instagramController.addAccount);
router.get('/accounts', isAuthenticated, instagramController.getAccounts);
router.delete('/account/:accountId', isAuthenticated, instagramController.removeAccount);

// Post management
router.post('/post/schedule', isAuthenticated, apiLimiter, instagramController.schedulePost);
router.get('/posts/:accountId', isAuthenticated, instagramController.getScheduledPosts);
router.delete('/post/:postId', isAuthenticated, instagramController.deleteScheduledPost);

module.exports = router;