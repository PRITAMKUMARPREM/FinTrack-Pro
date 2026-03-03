const searchSpace = "BANNER IMAGE 28-02-2026 Dear Pritam Kumar Prem, Here's the summary of your transaction: Amount Debited: INR 100.00 Account Number: XX1404 Date & Time: 28-02-26, 22:52:53 IST Transaction Info:";
const regex = /(?:[$₹£€]|Rs\.?|INR|USD)\s*([\d,]+(?:\.\d{2})?)/gi;
let amount = 0;
let amountStr = "";
let matchText = "";
let m;

while ((m = regex.exec(searchSpace)) !== null) {
    console.log("Found match at index " + m.index);
    const prefix = searchSpace.substring(Math.max(0, m.index - 35), m.index).toLowerCase();
    const suffix = searchSpace.substring(m.index + m[0].length, Math.min(searchSpace.length, m.index + m[0].length + 15)).toLowerCase();
    console.log("Prefix: " + prefix);
    console.log("Suffix: " + suffix);
    if (prefix.includes('balance') || prefix.includes('available') || prefix.includes('limit') ||
        suffix.includes('balance') || suffix.includes('curr')) {
        console.log("Skipping due to balance keywords");
        continue;
    }

    amountStr = m[1].replace(/,/g, '');
    amount = Number(amountStr);
    matchText = m[0];
    break;
}
console.log("Extracted Amount: " + amount);
