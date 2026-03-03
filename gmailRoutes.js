const express = require("express");
const router = express.Router();
const { google } = require("googleapis");
const Expense = require("./models/expense");
const jwt = require('jsonwebtoken');
const fs = require('fs');
const mongoose = require('mongoose');

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "http://localhost:5050/auth/google/callback"
);

// Redirect to Google
router.get("/google", (req, res) => {
    const { token } = req.query; // Expect token from frontend

    const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/gmail.readonly"],
        state: token // Pass token to preserve user context
    });
    res.redirect(url);
});

// Callback
router.get("/google/callback", async (req, res) => {
    const { code, state } = req.query;

    let userId = null;
    if (state === 'simulated_jwt_token_for_demo_purposes_only') {
        userId = 'demo123';
    } else if (state) {
        try {
            const JWT_SECRET = process.env.JWT_SECRET || 'fintrack_super_secret_jwt_key_2026';
            const decoded = jwt.verify(state, JWT_SECRET);
            userId = decoded.user.id;
        } catch (err) {
            console.error("Invalid state token for Gmail sync", err);
            return res.status(401).send("Authentication failed during Gmail Sync.");
        }
    }

    if (!userId) {
        return res.status(401).send("User context missing. Please login again.");
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);
        fs.appendFileSync("gmail_execution.log", "\n--- SYNC STARTED at " + new Date().toISOString() + " ---\n");

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        const response = await gmail.users.messages.list({
            userId: "me",
            maxResults: 75,
            q: "category:purchases OR category:updates OR subject:receipt OR subject:order OR subject:payment OR subject:invoice OR subject:transaction OR subject:paid OR debited OR \"A/c\""
        });

        const messages = response.data.messages || [];
        console.log(`[Gmail Sync] Found ${messages.length} targeted financial emails.`);

        let importedCount = 0;
        let debugText = "";

        // Clear the debug dump file before tracing
        fs.writeFileSync("gmail_debug.txt", "=== GMAIL SYNC DEBUG TRACE START ===\n\n");

        // Purge bad mock data to ensure clean presentation sync relative to the current active user
        if (global.mockExpenses) {
            global.mockExpenses = global.mockExpenses.filter(e => e.userId !== userId);
        }

        for (let msg of messages) {
            try {
                const msgData = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id,
                    format: "full"
                });

                const snippet = msgData.data.snippet || "";
                let emailBody = "";
                const payload = msgData.data.payload;

                if (payload && payload.parts) {
                    for (let part of payload.parts) {
                        if ((part.mimeType === 'text/plain' || part.mimeType === 'text/html') && part.body.data) {
                            emailBody += Buffer.from(part.body.data, 'base64').toString('utf8') + " ";
                        }
                    }
                } else if (payload && payload.body && payload.body.data) {
                    emailBody += Buffer.from(payload.body.data, 'base64').toString('utf8');
                }

                const cleanBody = emailBody.replace(/<[^>]+>/g, ' ').replace(/\n|\r/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
                const cleanSnippet = snippet.replace(/&#39;/g, "'").replace(/&amp;/g, "&");
                const searchSpace = (cleanSnippet + " " + cleanBody).replace(/\s+/g, ' ');

                // Dump everything to persistent file so AI can read it perfectly
                if (messages.indexOf(msg) < 10) {
                    fs.appendFileSync(
                        "gmail_debug.txt",
                        `\n[Email ${messages.indexOf(msg) + 1}/${messages.length}]\nSNIPPET: ${snippet.substring(0, 300)}\nBODY: ${emailBody.substring(0, 300)}\nSEARCH SPACE: ${searchSpace.substring(0, 300)}\n------------------------\n`
                    );
                }

                // DEBUG LOGGING: Print every email to figure out what the regex is missing
                console.log(`\nEmail ${messages.indexOf(msg) + 1}/${messages.length}:`);
                console.log(`Snippet: ${snippet.substring(0, 120)}...`);

                if (!debugText && messages.indexOf(msg) === 0) {
                    debugText = searchSpace.substring(0, 600);
                }

                // Look for amounts: $, ₹, Rs., INR, USD followed by numbers.
                // Actively skip account balance or limit readouts
                const regex = /(?:[$₹£€]|Rs\.?|INR|USD)\s*([\d,]+(?:\.\d{2})?)/gi;
                let amount = 0;
                let amountStr = "";
                let matchText = "";
                let m;

                while ((m = regex.exec(searchSpace)) !== null) {
                    const prefix = searchSpace.substring(Math.max(0, m.index - 35), m.index).toLowerCase();
                    const suffix = searchSpace.substring(m.index + m[0].length, Math.min(searchSpace.length, m.index + m[0].length + 15)).toLowerCase();

                    if (prefix.includes('balance') || prefix.includes('available') || prefix.includes('limit') ||
                        suffix.includes('balance') || suffix.includes('curr') ||
                        searchSpace.toLowerCase().includes('moneycontrol')) {
                        // This is an account balance readout or a known newsletter with fake numbers, skip it
                        continue;
                    }

                    amount = Number(m[1].replace(/,/g, ''));
                    matchText = m[0];
                    break; // Found the actual transaction amount
                }

                if (amount === 0) {
                    // Hyper-specific fallback for this exactly formatted bank email
                    const fallbackMatch = searchSpace.match(/Amount\s+(?:Debited|Credited|Spent|Paid)(?:[^:A-Z]{0,5})?:?\s*(?:INR|Rs\.?|USD|[₹$£€])\s*([\d,]+(?:\.\d{2})?)/i);
                    if (fallbackMatch) {
                        amount = Number(fallbackMatch[1].replace(/,/g, ''));
                        matchText = fallbackMatch[0];
                    }
                }

                if (amount > 0) {
                    console.log(`=> REGEX MATCH FOUND: ${matchText} (Skipped Balance)`);

                    // Look for Account Suffix like XX1404
                    const acctMatch = searchSpace.match(/(?:A\/c|Account Number)[:\s]+(XX\d{4}|\d{4})/i);
                    const accountInfo = acctMatch ? (acctMatch[1].includes('XX') ? acctMatch[1].toUpperCase() : 'XX' + acctMatch[1]) : null;

                    // Determine transaction type (income vs expense)
                    const isIncome = searchSpace.toLowerCase().includes("credited") || searchSpace.toLowerCase().includes("received") || searchSpace.toLowerCase().includes("refund");
                    const isExpense = searchSpace.toLowerCase().includes("debited") || searchSpace.toLowerCase().includes("paid") || searchSpace.toLowerCase().includes("spent");

                    // Default to expense if we see debited, otherwise fall back to expense as safe default for receipts
                    const txType = isIncome && !isExpense ? "income" : "expense";

                    // Generate a clean title based on context
                    let title = "Gmail Auto-Import";
                    if (searchSpace.toLowerCase().includes("zomato") || searchSpace.toLowerCase().includes("swiggy")) title = "Food Delivery";
                    if (searchSpace.toLowerCase().includes("uber") || searchSpace.toLowerCase().includes("ola")) title = "Ride Share";
                    if (searchSpace.toLowerCase().includes("amazon") || searchSpace.toLowerCase().includes("flipkart")) title = "Online Shopping";
                    if (searchSpace.toLowerCase().includes("debited from your a/c") || searchSpace.toLowerCase().includes("debited:")) title = "Bank Debit";
                    if (searchSpace.toLowerCase().includes("credited to your a/c") || searchSpace.toLowerCase().includes("credited:")) title = "Bank Credit";

                    if (searchSpace.toLowerCase().includes("netflix")) title = "Netflix";
                    if (searchSpace.toLowerCase().includes("spotify")) title = "Spotify";
                    if (searchSpace.toLowerCase().includes("amazon prime")) title = "Amazon Prime";

                    const isSubscription = searchSpace.toLowerCase().includes("subscription") ||
                        searchSpace.toLowerCase().includes("recurring") ||
                        searchSpace.toLowerCase().includes("renew") ||
                        title === "Netflix" || title === "Spotify" || title === "Amazon Prime";

                    try {
                        if (mongoose.connection.readyState !== 1) throw new Error("DB Offline");

                        // Check if transaction matches a user-set goal
                        const Goal = require('./models/goal');
                        const userGoals = await Goal.find({ userId: userId });
                        let goalMatched = false;

                        for (let g of userGoals) {
                            if (searchSpace.toLowerCase().includes(g.title.toLowerCase()) || title.toLowerCase().includes(g.title.toLowerCase())) {
                                g.currentAmount += amount;
                                await g.save();
                                goalMatched = true;
                                console.log(`[Gmail Sync] Goal Updated: +${amount} to "${g.title}"`);
                                break;
                            }
                        }

                        // Also record as a standard transaction
                        await Expense.create({
                            title: title,
                            amount: amount,
                            category: goalMatched ? "Savings/Investment" : (isSubscription ? "Subscriptions" : "Auto"),
                            type: goalMatched ? "income" : txType, // Goals are technically savings (increasing net worth)
                            userId: userId,
                            accountInfo: accountInfo
                        });

                        if (isSubscription && txType === 'expense') {
                            const Subscription = require('./models/subscription');
                            const nextDate = new Date();
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            await Subscription.create({
                                title: title,
                                amount: amount,
                                billingCycle: "monthly",
                                nextBillingDate: nextDate,
                                userId: userId
                            });
                        }

                        importedCount++;
                        console.log(`[Gmail Sync] DB Saved: ${amount.toLocaleString()} (${goalMatched ? 'income' : txType}) - "${title}" - Acct: ${accountInfo}`);
                    } catch (dbErr) {
                        let goalMatched = false;
                        if (global.mockGoals) {
                            const userMockGoals = global.mockGoals.filter(g => g.userId === userId);
                            for (let g of userMockGoals) {
                                if (searchSpace.toLowerCase().includes(g.title.toLowerCase()) || title.toLowerCase().includes(g.title.toLowerCase())) {
                                    g.currentAmount += amount;
                                    goalMatched = true;
                                    console.log(`[Gmail Sync] Mock Goal Updated: +${amount} to "${g.title}"`);
                                    break;
                                }
                            }
                        }

                        global.mockExpenses = global.mockExpenses || [];
                        global.mockExpenses.push({
                            id: `mock_exp_${Date.now()}_${Math.random()}`,
                            title: title,
                            amount: amount,
                            category: goalMatched ? "Savings/Investment" : (isSubscription ? "Subscriptions" : "Auto"),
                            type: goalMatched ? "income" : txType,
                            userId: userId,
                            accountInfo: accountInfo
                        });

                        if (isSubscription && txType === 'expense') {
                            global.mockSubs = global.mockSubs || [];
                            const nextDate = new Date();
                            nextDate.setMonth(nextDate.getMonth() + 1);
                            global.mockSubs.push({
                                id: `mock_sub_${Date.now()}_${Math.random()}`,
                                title: title,
                                amount: amount,
                                billingCycle: "monthly",
                                nextBillingDate: nextDate,
                                userId: userId
                            });
                        }

                        importedCount++;
                        console.log(`[Gmail Sync] Memory Saved: ${amount.toLocaleString()} (${goalMatched ? 'income' : txType}) - "${title}" - Acct: ${accountInfo}`);
                    }
                } else {
                    console.log(`=> No Transaction Match. (Possible Balance Skipped)`);
                }
            } catch (e) {
                console.error(`[Gmail Sync] Failed to parse email ${msg.id}:`, e.message);
            }
        }

        // Removed Failsafe Trigger per user request to only show real extracted data

        console.log(`[Gmail Sync] Complete. Imported ${importedCount} transactions.`);
        fs.appendFileSync("gmail_execution.log", "Sync Complete. Imported " + importedCount + " transactions\n");
        res.redirect(`/?sync=success&count=${importedCount}`);
    } catch (globalErr) {
        console.error("[Gmail Sync] FATAL OAUTH ERROR:", globalErr);
        fs.appendFileSync("gmail_execution.log", "FATAL OAUTH ERROR: " + globalErr.message + "\n");
        res.redirect(`/?error=${encodeURIComponent(globalErr.message)}`);
    }
});

module.exports = router;