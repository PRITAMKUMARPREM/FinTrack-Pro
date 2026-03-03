const API = "http://localhost:5000/api/expenses";

async function addExpense() {
    const data = {
        title: document.getElementById("title").value,
        amount: Number(document.getElementById("amount").value),
        category: document.getElementById("category").value,
        paymentMethod: document.getElementById("paymentMethod").value,
        type: document.getElementById("type").value
    };

    await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    loadData();
}

async function loadData() {
    const res = await fetch(API);
    const data = await res.json();

    const list = document.getElementById("list");
    list.innerHTML = "";

    data.forEach(item => {
        const li = document.createElement("li");
        li.innerText = `${item.title} - ₹${item.amount} (${item.paymentMethod})`;
        list.appendChild(li);
    });

    loadSummary();
}

async function loadSummary() {
    const res = await fetch(API + "/summary");
    const data = await res.json();

    document.getElementById("income").innerText = "Total Income: ₹" + data.totalIncome;
    document.getElementById("expense").innerText = "Total Expense: ₹" + data.totalExpense;
    document.getElementById("savings").innerText = "Savings: ₹" + data.savings;
    document.getElementById("suggestion").innerText = "Suggestion: " + data.suggestion;
}

loadData();