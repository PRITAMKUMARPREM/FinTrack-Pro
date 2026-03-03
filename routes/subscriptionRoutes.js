const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Subscription = require('../models/subscription');
const auth = require('../middleware/authMiddleware');

// Get subscriptions
router.get('/', auth, async (req, res) => {
    let data = [];
    try {
        if (mongoose.connection.readyState !== 1) throw new Error("DB Offline");
        data = await Subscription.find({ userId: req.user.id });
    } catch (err) {
        console.warn("⚠️ MongoDB Offline - Fetching subscriptions from In-Memory Storage");
    }

    if (!global.mockSubs) global.mockSubs = [];
    // Combine mock data and real data
    const allSubs = [...global.mockSubs.filter(s => s.userId === req.user.id), ...data];
    res.json(allSubs);
});

// Add subscription
router.post('/', auth, async (req, res) => {
    try {
        const { title, amount, billingCycle, nextBillingDate } = req.body;
        const newSub = new Subscription({
            title,
            amount,
            billingCycle,
            nextBillingDate,
            userId: req.user.id
        });
        await newSub.save();
        res.status(201).json(newSub);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
