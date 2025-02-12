// routes/admin/plans.js
const express = require('express');
const router = express.Router();
const planController = require('../../controllers/PlanController');

// Base route is /admin/plans
router.get('/', planController.showPlans);
router.post('/', planController.createPlan);
router.get('/:id', planController.getPlan);
router.put('/:id', planController.updatePlan);
router.delete('/:id', planController.deletePlan);

module.exports = router;