// routes/admin/plans.js
const express = require('express');
const router = express.Router();
const planController = require('../../controllers/PlanController');
const { isAdmin } = require('../../middleware/auth');

// Apply admin middleware to all routes
router.use(isAdmin);

// Plan management routes
router.get('/plans', planController.showPlans);
router.post('/plans', planController.createPlan);
router.get('/plans/:id', planController.getPlan);
router.put('/plans/:id', planController.updatePlan);
router.delete('/plans/:id', planController.deletePlan);

module.exports = router;