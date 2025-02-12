// routes/admin/dashboard.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/admin/DashboardController');
const { isAdmin } = require('../../middleware/auth');

router.get('/', isAdmin, dashboardController.index);

module.exports = router;