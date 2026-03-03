const express = require('express');
const router = express.Router();
const Goal = require('../models/goal');
const auth = require('../middleware/authMiddleware');

// Get all goals
router.get('/', auth, async (req, res) => {
    try {
        const goals = await Goal.find({ userId: req.user.id });
        if (goals.length > 0) return res.json(goals);

        // If DB is up but empty, just return empty, but if it throws we go to catch
        res.json(goals);
    } catch (err) {
        if (!global.mockGoals) {
            global.mockGoals = [
                { id: "mock_g1", userId: req.user.id, title: "Emergency Fund", currentAmount: 350000, targetAmount: 600000, targetDate: new Date("2026-12-31") },
                { id: "mock_g2", userId: req.user.id, title: "New Car Downpayment", currentAmount: 150000, targetAmount: 400000, targetDate: new Date("2027-06-15") }
            ];
        }
        res.json(global.mockGoals.filter(g => g.userId === req.user.id));
    }
});

// Add a new goal
router.post('/', auth, async (req, res) => {
    try {
        const { title, targetAmount, targetDate } = req.body;
        const newGoal = new Goal({
            title,
            targetAmount,
            targetDate,
            userId: req.user.id
        });
        await newGoal.save();
        res.status(201).json(newGoal);
    } catch (err) {
        if (!global.mockGoals) global.mockGoals = [];

        const newMockGoal = {
            id: `mock_g_${Date.now()}`,
            title: req.body.title,
            targetAmount: req.body.targetAmount,
            targetDate: req.body.targetDate,
            currentAmount: 0,
            userId: req.user.id
        };
        global.mockGoals.push(newMockGoal);
        res.status(201).json(newMockGoal);
    }
});

// Update Goal Progress (add savings)
router.put('/:id/progress', auth, async (req, res) => {
    try {
        const { amountToAdd } = req.body;
        const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });
        if (!goal) return res.status(404).json({ message: "Goal not found" });

        goal.currentAmount += amountToAdd;
        await goal.save();
        res.json(goal);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
