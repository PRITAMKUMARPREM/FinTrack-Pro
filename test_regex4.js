const searchSpace = "BANNER IMAGE 28-02-2026 Dear Pritam Kumar Prem, Here&#39;s the summary of your transaction: Amount Debited: INR 10.00 Account Number: XX1404 Date &amp; Time: 28-02-26, 10:56:08 IST Transaction Info:";
const regex = /(?:[$₹£€]|Rs\.?|INR|USD)\s*([\d,]+(?:\.\d{2})?)/gi;
let finalAmount = 0;
let finalMatchText = "";
let m;

while ((m = regex.exec(searchSpace)) !== null) {
    const prefix = searchSpace.substring(Math.max(0, m.index - 35), m.index).toLowerCase();
    const suffix = searchSpace.substring(m.index + m[0].length, Math.min(searchSpace.length, m.index + m[0].length + 15)).toLowerCase();
    
    if (prefix.includes('balance') || prefix.includes('available') || prefix.includes('limit') ||
        suffix.includes('balance') || suffix.includes('curr')) {
        continue;
    }
    
    // As soon as we find a VALID amount that isn't a balance, capture it and STOP searching this email
    finalAmount = Number(m[1].replace(/,/g, ''));
    finalMatchText = m[0];
    break; 
}

if (finalAmount === 0) {
    const fallbackMatch = searchSpace.match(/Amount\s+(?:Debited|Credited|Spent|Paid)(?:[^:A-Z]{0,5})?:?\s*(?:INR|Rs\.?|USD|[₹$£€])\s*([\d,]+(?:\.\d{2})?)/i);
    if (fallbackMatch) {
        finalAmount = Number(fallbackMatch[1].replace(/,/g, ''));
        finalMatchText = fallbackMatch[0];
    }
}
console.log("Extracted:", finalAmount, finalMatchText);
