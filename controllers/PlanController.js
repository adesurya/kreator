// controllers/PlanController.js
const db = require('../config/database');

const planController = {
    // Render plans management page
    showPlans: async (req, res) => {
        try {
            const [plans] = await db.execute(
                'SELECT *, (SELECT COUNT(*) FROM user_subscriptions WHERE plan_id = plans.id) as subscriber_count FROM plans ORDER BY price ASC'
            );
            
            res.render('admin/plans', {
                plans,
                user: req.session.user
            });
        } catch (error) {
            console.error('Error loading plans:', error);
            res.status(500).send('Failed to load plans');
        }
    },

    // Create new plan
    createPlan: async (req, res) => {
        try {
            const { name, price, duration } = req.body;

            // Validation
            if (!name || !price || !duration) {
                return res.status(400).json({
                    error: 'All fields are required'
                });
            }

            const [result] = await db.execute(
                'INSERT INTO plans (name, price, duration) VALUES (?, ?, ?)',
                [name, price, duration]
            );

            res.json({
                success: true,
                plan: {
                    id: result.insertId,
                    name,
                    price,
                    duration,
                    is_active: 1,
                    subscriber_count: 0
                }
            });
        } catch (error) {
            console.error('Error creating plan:', error);
            res.status(500).json({ error: 'Failed to create plan' });
        }
    },

    // Update existing plan
    updatePlan: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, price, duration, is_active } = req.body;

            // Validation
            if (!name || !price || !duration) {
                return res.status(400).json({
                    error: 'All fields are required'
                });
            }

            await db.execute(
                'UPDATE plans SET name = ?, price = ?, duration = ?, is_active = ? WHERE id = ?',
                [name, price, duration, is_active ? 1 : 0, id]
            );

            res.json({ success: true });
        } catch (error) {
            console.error('Error updating plan:', error);
            res.status(500).json({ error: 'Failed to update plan' });
        }
    },

    // Delete plan
    deletePlan: async (req, res) => {
        try {
            const { id } = req.params;

            // Check if plan has active subscribers
            const [subscribers] = await db.execute(
                'SELECT COUNT(*) as count FROM user_subscriptions WHERE plan_id = ? AND end_date > CURRENT_TIMESTAMP',
                [id]
            );

            if (subscribers[0].count > 0) {
                return res.status(400).json({
                    error: 'Cannot delete plan with active subscribers'
                });
            }

            await db.execute('DELETE FROM plans WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting plan:', error);
            res.status(500).json({ error: 'Failed to delete plan' });
        }
    },

    // Get plan details
    getPlan: async (req, res) => {
        try {
            const [plans] = await db.execute(
                'SELECT * FROM plans WHERE id = ?',
                [req.params.id]
            );

            if (plans.length === 0) {
                return res.status(404).json({ error: 'Plan not found' });
            }

            res.json({ plan: plans[0] });
        } catch (error) {
            console.error('Error getting plan:', error);
            res.status(500).json({ error: 'Failed to get plan details' });
        }
    }
};

module.exports = planController;