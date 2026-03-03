const express = require("express");
const router = express.Router();
const Expense = require("../models/expense");
const auth = require("../middleware/authMiddleware");
const mongoose = require('mongoose');

// Add Manual Expense
router.post("/", auth, async (req, res) => {
    try {
        const expense = new Expense({
            ...req.body,
            userId: req.user.id
        });
        await expense.save();
        res.json(expense);
    } catch (err) {
        // Offline Failsafe
        if (!global.mockExpenses) global.mockExpenses = [];
        const mockExpense = {
            id: `mock_exp_${Date.now()}_${Math.random()}`,
            ...req.body,
            userId: req.user.id,
            date: new Date()
        };
        global.mockExpenses.unshift(mockExpense);
        res.json(mockExpense);
    }
});

// Helper to get combined offline/online data
async function getUserExpenses(userId) {
    let data = [];
    try {
        if (mongoose.connection.readyState !== 1) throw new Error("DB Offline");
        data = await Expense.find({ userId }).sort({ date: -1 });
    } catch (dbErr) {
        console.warn("⚠️ MongoDB Offline - Fetching expenses from In-Memory Storage");
    }

    if (!global.mockExpenses) {
        global.mockExpenses = [];
    }

    // Ensure demo user ALWAYS has their Failsafe synced data even if the Node server restarts 
    // DEACTIVATED: User explicitly requested to ONLY see real extracted Gmail data, no mock data.

    if (global.mockExpenses) {
        const mockData = global.mockExpenses.filter(e => e.userId === userId).map(e => ({
            ...e, date: e.date || new Date()
        }));
        data = [...mockData, ...data];
    }
    return data;
}

// Get All
router.get("/", auth, async (req, res) => {
    try {
        console.log(`[Dashboard] GET /expenses called for user: ${req.user.id}`);
        const data = await getUserExpenses(req.user.id);
        console.log(`[Dashboard] Sending ${data.length} expenses to client. mockExpenses length: ${global.mockExpenses ? global.mockExpenses.length : 0}`);
        res.json(data);
    } catch (err) {
        console.error(`[Dashboard] GET /expenses Error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// Summary
router.get("/summary", auth, async (req, res) => {
    try {
        console.log(`[Dashboard] GET /summary called for user: ${req.user.id}`);
        const data = await getUserExpenses(req.user.id);
        let totalIncome = 0;
        let totalExpense = 0;

        data.forEach(e => {
            if (e.type === "income") totalIncome += e.amount;
            else totalExpense += e.amount;
        });

        console.log(`[Dashboard] Sending summary: Total Inc: ${totalIncome}, Total Exp: ${totalExpense}`);
        res.json({
            totalIncome,
            totalExpense,
            savings: totalIncome - totalExpense
        });
    } catch (err) {
        console.error(`[Dashboard] GET /summary Error:`, err);
        res.status(500).json({ error: err.message });
    }
});

// AI Prediction
router.get("/ai-prediction", auth, async (req, res) => {
    try {
        const data = await getUserExpenses(req.user.id);

        const expenses = data.filter(e => e.type === "expense" || !e.type);
        const incomes = data.filter(e => e.type === "income");

        let totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
        let totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
        let savings = totalIncome - totalExpense;

        let latestAccount = "**** **** **** 4092"; // Default fallback
        const accountSource = data.find(item => item.accountInfo);
        if (accountSource) latestAccount = "**** **** **** " + accountSource.accountInfo.replace('XX', '');

        if (expenses.length === 0)
            return res.json({ message: "Not enough data for prediction" });

        const monthly = {};
        const categories = {};

        expenses.forEach(item => {
            const month = new Date(item.date).getMonth();
            monthly[month] = (monthly[month] || 0) + item.amount;
            categories[item.category] = (categories[item.category] || 0) + item.amount;
        });

        const values = Object.values(monthly);
        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

        // Find highest spending category
        let highestCategory = "";
        let maxSpend = 0;
        for (const [cat, amt] of Object.entries(categories)) {
            if (amt > maxSpend) {
                maxSpend = amt;
                highestCategory = cat;
            }
        }

        let investmentAdvice = "Focus on building an emergency fund first (aim for 3-6 months of expenses).";
        if (savings > 10000) {
            investmentAdvice = "Great savings! Consider diversifying into Index Funds, Mutual Funds, and maybe some direct Blue-chip stocks.";
        } else if (savings > 5000) {
            investmentAdvice = "Good job! Start a SIP in a low-cost Mutual Fund or invest in a Fixed Deposit.";
        } else if (savings > 0) {
            investmentAdvice = "You are positive! Put this into a Recurring Deposit (RD) or high-yield savings to build momentum.";
        }

        let savingsTip = "Try the 50/30/20 rule: 50% Needs, 30% Wants, 20% Savings.";
        if (highestCategory) {
            savingsTip = `You spent the most on '${highestCategory}' (₹${maxSpend}). Try cutting this down by 10% next month.`;
        }

        res.json({
            averageMonthlyExpense: avg || 0,
            predictedNextMonthExpense: (avg || 0) * 1.05,
            savingsForecast: (totalIncome || 20000) - ((avg || 0) * 1.05),
            alert: (avg || 0) > (totalIncome || 15000) ? "⚠ High Spending Trend" : "Stable Spending",
            investmentAdvice: [investmentAdvice], // Frontend expects an array
            savingsTip,
            averageExpense: avg || 0,          // Added for frontend compatibility
            predictedExpense: (avg || 0) * 1.05, // Added for frontend compatibility
            predictedSavings: (totalIncome || 20000) - ((avg || 0) * 1.05), // Added for frontend compatibility
            latestAccount,
            totalIncome,
            totalExpense,
            savings
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;