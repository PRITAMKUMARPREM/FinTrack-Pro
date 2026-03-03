const fs = require('fs');

// We simulate an Amazon Prime email parsing to verify it works correctly
// and we simulate an email with a Goal to verify the tracking.

const testAmazonPrimeEmail = `
Clear up space, manage your storage, and more ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ ‌ Make the most of your storage Your Google One plan comes with 2 TB of storage to keep your importa
`;

const testPrimeFalsePositiveEmail = `
October 07, 2025 View in browser Moneycontrol cuts through the clutter and brings you the best of our exclusive stories,
I pay for Amazon Prime subscription, but I still have to rent the best movies.… ͏ ͏ ͏ ͏ ͏ ͏ ͏ ͏ ͏ ͏ ͏ ͏ ͏ ͏ ͏ ͏ ͏ ͏ ͏ ͏ ... Rs 30,000
`;

const testGoalMatchEmail = `
BANNER IMAGE 26-02-2026 Dear Pritam Kumar Prem, Here's the summary of your transaction: Amount Debited: INR 100.00 Acct: XX1404
Saved toward your Emergency Fund.
`;

const searchSpaces = [
    { name: "Real Amazon Prime Email", content: testAmazonPrimeEmail },
    { name: "False Positive Prime News", content: testPrimeFalsePositiveEmail },
    { name: "Goal Matched Transaction", content: testGoalMatchEmail }
];

const mockGoals = [
    { title: "Emergency Fund", currentAmount: 0 }
];

searchSpaces.forEach(item => {
    let searchSpace = item.content.replace(/\n/g, ' ').replace(/\s+/g, ' ');

    let amount = 0;
    let matchText = "";

    const regex = /(?:[$₹£€]|Rs\.?|INR|USD)\s*([\d,]+(?:\.\d{2})?)/gi;
    let m;
    while ((m = regex.exec(searchSpace)) !== null) {
        const prefix = searchSpace.substring(Math.max(0, m.index - 35), m.index).toLowerCase();
        const suffix = searchSpace.substring(m.index + m[0].length, Math.min(searchSpace.length, m.index + m[0].length + 15)).toLowerCase();

        if (prefix.includes('balance') || prefix.includes('available') || prefix.includes('limit') ||
            suffix.includes('balance') || suffix.includes('curr') ||
            searchSpace.toLowerCase().includes('moneycontrol')) {
            continue;
        }

        amount = Number(m[1].replace(/,/g, ''));
        matchText = m[0];
        break;
    }

    if (amount === 0) {
        const fallbackMatch = searchSpace.match(/Amount\s+(?:Debited|Credited|Spent|Paid)(?:[^:A-Z]{0,5})?:?\s*(?:INR|Rs\.?|USD|[₹$£€])\s*([\d,]+(?:\.\d{2})?)/i);
        if (fallbackMatch) {
            amount = Number(fallbackMatch[1].replace(/,/g, ''));
            matchText = fallbackMatch[0];
        }
    }

    if (amount > 0) {
        let title = "Gmail Auto-Import";
        if (searchSpace.toLowerCase().includes("amazon prime")) title = "Amazon Prime";

        let goalMatched = false;
        for (let g of mockGoals) {
            if (searchSpace.toLowerCase().includes(g.title.toLowerCase()) || title.toLowerCase().includes(g.title.toLowerCase())) {
                g.currentAmount += amount;
                goalMatched = true;
                break;
            }
        }

        console.log(`Test: ${item.name}`);
        console.log(`  Extracted Amount: ${amount}`);
        console.log(`  Title assigned: ${title}`);
        console.log(`  Goal Matched: ${goalMatched}`);
        console.log('---');
    } else {
        console.log(`Test: ${item.name}`);
        console.log(`  No amount matched.`);
        console.log('---');
    }
});

console.log("Mock Goals End State:");
console.log(mockGoals);
