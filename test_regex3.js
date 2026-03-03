const searchSpace = "BANNER IMAGE 28-02-2026 Dear Pritam Kumar Prem, Here&#39;s the summary of your transaction: Amount Debited: INR 10.00 Account Number: XX1404 Date &amp; Time: 28-02-26, 10:56:08 IST Transaction Info:";
const regex = /(?:[$₹£€]|Rs\.?|INR|USD)\s*([\d,]+(?:\.\d{2})?)/gi;
let amount = 0;
let m;
while ((m = regex.exec(searchSpace)) !== null) {
    const prefix = searchSpace.substring(Math.max(0, m.index - 35), m.index).toLowerCase();
    const suffix = searchSpace.substring(m.index + m[0].length, Math.min(searchSpace.length, m.index + m[0].length + 15)).toLowerCase();
    
    console.log("Match:", m[0]);
    console.log("Prefix:", prefix);
    console.log("Suffix:", suffix);
    if (prefix.includes('balance') || prefix.includes('available') || prefix.includes('limit') ||
        suffix.includes('balance') || suffix.includes('curr')) {
        console.log("Skipped due to balance/limit keywords.");
        continue;
    }
    let amountStr = m[1].replace(/,/g, '');
    amount = Number(amountStr);
    console.log("Extracted:", amount);
}
