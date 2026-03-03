const API = "http://localhost:5050/api/expenses";

let expenseChartInstance = null;
let netWorthChartInstance = null;
let trendChartInstance = null;
let radarChartInstance = null;
let investmentChartInstance = null;
let scenarioChartInstance = null;
let currentChartType = 'doughnut';
let allData = [];

const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || 'simulated_jwt_token_for_demo_purposes_only';
    return { 'Authorization': `Bearer ${token}` };
};

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
}

// Close dropdown if clicked outside
document.addEventListener('click', (e) => {
    const profileBadge = document.getElementById('profileBadge');
    const dropdown = document.getElementById('profileDropdown');
    if (profileBadge && dropdown && !profileBadge.contains(e.target) && dropdown.style.display === 'flex') {
        dropdown.style.display = 'none';
    }
});

document.addEventListener("DOMContentLoaded", () => {
    // Check for OAuth or external errors passed via URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error')) {
        Swal.fire({
            title: 'Sync Failed',
            text: urlParams.get('error'),
            icon: 'error',
            background: '#111827',
            color: '#fff'
        });
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('sync') === 'success') {
        const count = urlParams.get('count') || 0;
        Swal.fire({
            title: 'Sync Complete',
            text: `Successfully imported ${count} financial transactions from Gmail.`,
            icon: 'success',
            background: '#111827',
            color: '#fff',
            timer: 3000
        });

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // Ensure data is heavily refreshed
        fetchAllData();
    }

    checkAuthStatus();
    // Do not call fetchAllData again if we already synced 
    if (urlParams.get('sync') !== 'success') {
        fetchAllData();
    }

    // Health Score will animate when API loads

    // Handle Transaction Form
    document.getElementById('expenseForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('txTitle').value;
        const amount = document.getElementById('txAmount').value;
        const type = document.getElementById('txType').value;
        const category = document.getElementById('txCategory').value;

        try {
            // Anomaly Detection check
            const avg = parseInt(document.getElementById("avgExpense").innerText.replace(/[^0-9]/g, '')) || 500;
            if (amount > (avg * 2)) {
                Swal.fire({
                    title: '🚨 Unusual Spending Detected',
                    text: `This transaction of ₹${amount} is significantly higher than your average of ₹${avg}. Are you sure?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, proceed',
                    background: '#111827',
                    color: '#fff'
                }).then(async (result) => {
                    if (result.isConfirmed) submitTransaction(title, amount, category, type);
                });
            } else {
                submitTransaction(title, amount, category, type);
            }
        } catch (err) {
            console.error("Anomaly logic failed.", err);
            // Ensure transaction still submits even if anomaly UI check fails
            submitTransaction(title, amount, category, type);
        }
    });
});

async function submitTransaction(title, amount, category, type) {
    try {
        const res = await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getAuthHeaders() },
            body: JSON.stringify({ title, amount, category, type })
        });

        if (res.ok) {
            Swal.fire({
                title: 'Transaction Logged',
                text: `${title} was successfully recorded.`,
                icon: 'success',
                background: '#111827',
                color: '#fff',
                confirmButtonColor: '#3b82f6'
            });

            document.getElementById('expenseForm').reset();
            fetchAllData();
        } else if (res.status === 401) {
            Swal.fire({ title: 'Authentication Required', text: 'Please login to add expenses.', icon: 'warning', background: '#111827', color: '#fff' });
        }
    } catch (err) {
        // Offline Failsafe Submitter
        Swal.fire({
            title: 'Offline Save',
            text: `${title} was successfully recorded to local memory.`,
            icon: 'success',
            background: '#111827',
            color: '#fff',
            confirmButtonColor: '#3b82f6'
        });
        document.getElementById('expenseForm').reset();

        // Push strictly to the UI cache if running disconnected
        if (!window.allData) window.allData = [];
        window.allData.unshift({
            title: title,
            amount: Number(amount),
            type: type,
            category: category,
            date: new Date()
        });
        try { renderChart(window.allData); } catch (e) { }
        renderRecentTransactions(window.allData);
        fetchSummary();
    }
}

function fetchAllData() {
    fetchExpenses();
    fetchSummary();
    fetchAIPrediction();
    fetchGoals();
    fetchSubscriptions();
    fetchAnalytics();
}

// Tab Switching Logic
function switchTab(tabId) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById(`tab-${tabId}`).style.display = 'block';

    // Update Headers dynamically based on tab
    const titleObj = document.getElementById('welcomeTitle');
    if (tabId === 'overview') titleObj.innerHTML = `Welcome back, <span class="highlight">Innovator</span>`;
    if (tabId === 'analytics') titleObj.innerHTML = `Deep <span class="highlight">Analytics</span> Engine`;
    if (tabId === 'goals') titleObj.innerHTML = `Strategic <span class="highlight">Goals & Budgets</span>`;
    if (tabId === 'subscriptions') titleObj.innerHTML = `Recurring <span class="highlight">Subscriptions</span>`;
    if (tabId === 'investments') {
        titleObj.innerHTML = `Smart <span class="highlight">Investments</span>`;
        // initialize the chart on tab load if it hasn't been already
        if (!investmentChartInstance) {
            allocateInvestments();
        }
    }
    if (tabId === 'loans') titleObj.innerHTML = `Loans & <span class="highlight">EMI Checker</span>`;
    if (tabId === 'forensics') {
        titleObj.innerHTML = `AI <span class="highlight">Forensics</span> & Projections`;
        if (!scenarioChartInstance) {
            setupSimulationListeners();
            runSimulation();
        }
    }
}

// Modal Logic
function showLoginModal() {
    document.getElementById('authModal').style.display = 'flex';
}
function toggleGoalForm() {
    const form = document.getElementById('inlineGoalForm');
    const btn = document.getElementById('newGoalBtn');
    if (form.style.display === 'none' || form.style.display === '') {
        form.style.display = 'block';
        btn.innerHTML = '<i class="fa-solid fa-times"></i> Close';
    } else {
        form.style.display = 'none';
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> New Goal';
    }
}
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// Chart Logic
function updateChartType() {
    currentChartType = document.getElementById('chartTypeSelect').value;
    renderChart(allData);
}

function renderChart(data) {
    const ctx = document.getElementById("expenseChart").getContext("2d");

    // Only chart 'expenses'
    const expenses = data.filter(e => e.type === "expense" || !e.type);

    const categories = [...new Set(expenses.map(e => e.category))];
    const amounts = categories.map(cat =>
        expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
    );

    if (expenseChartInstance) {
        expenseChartInstance.destroy();
    }

    const themeColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

    expenseChartInstance = new Chart(ctx, {
        type: currentChartType,
        data: {
            labels: categories,
            datasets: [{
                label: "Expenses",
                data: amounts,
                backgroundColor: currentChartType === 'line' ? 'rgba(59, 130, 246, 0.2)' : themeColors,
                borderColor: currentChartType === 'line' ? '#3b82f6' : 'transparent',
                borderWidth: currentChartType === 'line' ? 3 : 0,
                fill: currentChartType === 'line',
                tension: 0.4
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: currentChartType === 'line' ? 'top' : 'right',
                    labels: { color: '#e5e7eb', padding: 20, font: { size: 12, family: "'Outfit', sans-serif" } }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: currentChartType === 'line' ? {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } }
            } : {},
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        }
    });
}

function renderNetWorthChart(currentSavings, monthlyDelta) {
    const canvas = document.getElementById("netWorthChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (netWorthChartInstance) netWorthChartInstance.destroy();

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const dataPoints = [];
    let cumulative = currentSavings - (monthlyDelta * 3);

    for (let i = 0; i < 6; i++) {
        dataPoints.push(cumulative);
        cumulative += monthlyDelta + (Math.random() * 5000 - 2500);
    }

    netWorthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Net Worth',
                data: dataPoints,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#10b981'
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { display: false }, ticks: { display: false } },
                x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { family: "'Outfit'" } } }
            }
        }
    });
}

// API Data Fetching
async function fetchExpenses() {
    try {
        const res = await fetch(API, { headers: getAuthHeaders() });
        if (res.ok) {
            allData = await res.json();
            try {
                renderChart(allData);
            } catch (chartErr) {
                console.error("Chart Render Error:", chartErr);
            }
            renderRecentTransactions(allData);
        } else {
            console.warn(`Backend error fetching expenses: ${res.status}`);
            throw new Error("Backend Returned " + res.status);
        }
    } catch (err) {
        console.error("Fetch Exception: Using offline mock data.", err);
        Swal.fire({
            title: 'Dashboard Display Error',
            text: 'We are having trouble loading your offline transactions to the screen: ' + err.message,
            icon: 'error',
            background: '#111827',
            color: '#fff'
        });

        // Render fake data for visual placement only if completely unreachable
        if (!window.allData) window.allData = [];
        renderRecentTransactions(window.allData);
    }
}

function renderRecentTransactions(data) {
    const container = document.getElementById('recentTxContainer');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = `<div class="text-center text-secondary mt-3">No recent transactions.</div>`;
        return;
    }

    // Sort by newest first (assuming array is appended to normally)
    const recent = [...data].reverse().slice(0, 4);

    let html = '';
    recent.forEach(tx => {
        const isIncome = tx.type === 'income';
        const icon = isIncome ? 'fa-arrow-trend-up text-success' : 'fa-arrow-trend-down text-danger';
        const amountColor = isIncome ? 'text-success' : '';
        const operator = isIncome ? '+' : '-';

        html += `
            <div class="goal-item glass-inner p-2 mb-1" style="padding: 1rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div class="avatar" style="width: 32px; height: 32px; font-size: 0.8rem; background: rgba(255,255,255,0.05);">
                        <i class="fa-solid ${icon}"></i>
                    </div>
                    <div>
                        <h4 style="font-size: 0.95rem; margin-bottom: 2px;">${tx.title}</h4>
                        <span class="text-secondary" style="font-size: 0.75rem;">${tx.category}</span>
                    </div>
                </div>
                <div class="${amountColor}" style="font-weight: 600; font-size: 1.05rem;">
                    ${operator}₹${tx.amount.toLocaleString()}
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function fetchSummary() {
    try {
        const res = await fetch(`${API}/summary`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Offline");
        const data = await res.json();

        // Ensure calculations work even if backend sends raw numbers
        const totalInc = data.totalIncome || 0;
        const totalExp = data.totalExpense || 0;
        const netSavings = data.savings !== undefined ? data.savings : (totalInc - totalExp);

        document.getElementById("income").innerText = `₹${totalInc.toLocaleString()}`;
        document.getElementById("expense").innerText = `₹${totalExp.toLocaleString()}`;

        // Update the 3D Interactive Digital Card Live Balance
        const cardBalance = document.getElementById("cardBalance");
        if (cardBalance) {
            cardBalance.innerHTML = `₹${netSavings.toLocaleString()}`;
        }
        const acctDisp = document.getElementById("accountNumberDisplay");
        if (acctDisp && data.latestAccount) {
            acctDisp.innerText = data.latestAccount;
        }

        // Burn Rate Calculation (Runway in days)
        const dailyBurn = totalExp / 30;
        const runway = dailyBurn > 0 ? Math.floor(netSavings / dailyBurn) : '∞';
        const burnEl = document.getElementById("burnRate");
        burnEl.innerText = `${runway} days`;
        if (runway !== '∞' && runway < 30) burnEl.className = "amount text-danger";
        else burnEl.className = "amount text-success";

        // Net Worth Trend Simulation
        renderNetWorthChart(netSavings, totalInc - totalExp);
    } catch (err) {
        console.warn("Using offline summary calculations.");

        // Failsafe calculations
        // Calculate totals dynamically from UI cache
        let totalInc = 0;
        let totalExp = 0;
        if (window.allData) {
            window.allData.forEach(tx => {
                if (tx.type === 'income') totalInc += Number(tx.amount);
                else totalExp += Number(tx.amount);
            });
        }
        let netSavings = totalInc - totalExp;

        document.getElementById("income").innerText = `₹${totalInc.toLocaleString()}`;
        document.getElementById("expense").innerText = `₹${totalExp.toLocaleString()}`;

        const cardBalance = document.getElementById("cardBalance");
        if (cardBalance) cardBalance.innerHTML = `₹${netSavings.toLocaleString()}`;

        const burnEl = document.getElementById("burnRate");
        burnEl.innerText = `100 days`;
        burnEl.className = "amount text-success";

        renderNetWorthChart(netSavings, totalInc - totalExp);
    }
}

async function fetchAIPrediction() {
    try {
        const res = await fetch(`${API}/ai-prediction`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Offline");
        const data = await res.json();

        // Handle not enough data
        if (data.message) {
            document.getElementById("alert").innerHTML = `⚠️ <strong>INFO:</strong> ${data.message}`;
            return;
        }

        document.getElementById("avgExpense").innerText = `₹${Math.round(data.averageExpense).toLocaleString()}`;
        document.getElementById("predictedExpense").innerText = `₹${Math.round(data.predictedExpense).toLocaleString()}`;
        document.getElementById("forecast").innerText = `₹${Math.round(data.predictedSavings).toLocaleString()}`;

        document.getElementById("savingsTip").innerHTML = `<strong>Insight:</strong> ${data.savingsAdvice}`;
        document.getElementById("investmentAdvice").innerHTML = `<strong>Strategy:</strong> ${data.investmentAdvice.join(', ')}`;

        // Dynamic Health Engine Alert
        const alertBox = document.getElementById("alertBox");
        const alertText = document.getElementById("alert");

        // Dynamic Health Score Calculation
        let healthScore = 0;
        let inc = data.totalIncome || 0;
        let exp = data.totalExpense || 0;
        if (inc > 0) {
            let ratio = exp / inc;
            // Best case: exp is 0 (score 100). If exp = inc, score 50. If exp >= 2*inc, score 0.
            healthScore = Math.max(0, Math.min(100, Math.round(100 - (ratio * 50))));
        } else if (exp > 0) {
            healthScore = 15; // Expenses but no income = poor health
        }

        if (data.predictedSavings < 0) {
            alertBox.style.borderLeftColor = "#ef4444";
            document.querySelector(".score-ring").style.borderTopColor = "#ef4444";
            document.querySelector(".score-status").innerText = "Critical Condition";
            document.querySelector(".score-status").className = "score-status text-danger";
            alertText.innerHTML = "⚠️ <strong>CRITICAL ALERT:</strong> You are predicting to spend more than you earn next month. Immediate budget cuts required.";
        } else {
            alertBox.style.borderLeftColor = "#10b981";
            document.querySelector(".score-ring").style.borderTopColor = "#10b981";
            document.querySelector(".score-status").innerText = "Solid Condition";
            document.querySelector(".score-status").className = "score-status text-success";

            // Personality Analysis
            let personality = "Conservative Spender";
            if (data.totalExpense > data.totalIncome * 0.8) personality = "Risk Taker";
            if (data.totalExpense < 5000) personality = "Frugal Master";

            alertText.innerHTML = `✅ <strong>STAT:</strong> ${personality}. Spending is within expected standard deviations.`;
        }

        animateHealthScore(healthScore);

    } catch (err) {
        console.warn("Using offline AI predictions.");
    }
}

let healthScoreInterval;
function animateHealthScore(target) {
    if (healthScoreInterval) clearInterval(healthScoreInterval);
    let current = 0;
    const el = document.getElementById('healthScore');
    if (!el) return;
    healthScoreInterval = setInterval(() => {
        if (current >= target) {
            clearInterval(healthScoreInterval);
            el.innerText = target;
        } else {
            current += 2;
            if (current > target) current = target;
            el.innerText = current;
        }
    }, 20);
}

function exportData(type) {
    Swal.fire({
        title: 'Generating Export...',
        text: `Compiling your financial data into ${type.toUpperCase()} format.`,
        icon: 'info',
        background: '#111827',
        color: '#fff',
        timer: 2000,
        showConfirmButton: false
    });
}

// Goals API
async function fetchGoals() {
    try {
        const res = await fetch("http://localhost:5050/api/goals", { headers: getAuthHeaders() });
        if (!res.ok) return;
        const goals = await res.json();

        let html = '';
        goals.forEach(goal => {
            const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            html += `
                <div class="goal-item glass-inner">
                    <div class="goal-header flex-between">
                        <h4>${goal.title}</h4>
                        <span class="text-warning">₹${goal.currentAmount.toLocaleString()} / ₹${goal.targetAmount.toLocaleString()}</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${percent}%"></div>
                    </div>
                    <p class="goal-tip mt-1 text-secondary">Est. Completion: ${new Date(goal.targetDate).toLocaleDateString()}</p>
                </div>
            `;
        });
        document.getElementById("goalsContainer").innerHTML = html;

    } catch (err) {
        console.warn("Using offline goals data.");

        const mockGoals = [
            { title: "Emergency Fund", currentAmount: 350000, targetAmount: 600000, targetDate: new Date("2026-12-31") },
            { title: "New Car Downpayment", currentAmount: 150000, targetAmount: 400000, targetDate: new Date("2027-06-15") }
        ];

        let html = '';
        mockGoals.forEach(goal => {
            const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            html += `
                <div class="goal-item glass-inner">
                    <div class="goal-header flex-between">
                        <h4>${goal.title}</h4>
                        <span class="text-warning">₹${goal.currentAmount.toLocaleString()} / ₹${goal.targetAmount.toLocaleString()}</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${percent}%"></div>
                    </div>
                    <p class="goal-tip mt-1 text-secondary">Est. Completion: ${new Date(goal.targetDate).toLocaleDateString()}</p>
                </div>
            `;
        });
        document.getElementById("goalsContainer").innerHTML = html;
    }
}

async function fetchSubscriptions() {
    try {
        const res = await fetch("http://localhost:5050/api/subscriptions", { headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Offline");
        const subs = await res.json();

        let html = '';
        subs.forEach(sub => {
            html += `
                <div class="goal-item glass-inner flex-between" style="flex-direction: row; margin-bottom: 0.8rem; padding: 1rem;">
                    <div>
                        <h4 style="margin-bottom: 5px;"><i class="fa-solid fa-cube text-secondary"></i> &nbsp; ${sub.title}</h4>
                        <p class="text-secondary" style="font-size: 0.85rem;">Renews: ${new Date(sub.nextBillingDate).toLocaleDateString()}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 1.2rem; font-weight: 700;">₹${sub.amount.toLocaleString()}</span>
                        <p class="text-secondary" style="font-size: 0.85rem;">/${sub.billingCycle === 'yearly' ? 'yr' : 'mo'}</p>
                    </div>
                </div>
            `;
        });
        document.getElementById("subsContainer").innerHTML = html;

    } catch (err) {
        console.warn("Using offline subscriptions data.");

        const mockSubs = [
            { title: "Netflix Premium", nextBillingDate: new Date("2026-03-15"), amount: 649, billingCycle: "monthly" },
            { title: "Amazon Prime", nextBillingDate: new Date("2026-11-20"), amount: 1499, billingCycle: "yearly" },
            { title: "Spotify Family", nextBillingDate: new Date("2026-03-10"), amount: 179, billingCycle: "monthly" }
        ];

        let html = '';
        mockSubs.forEach(sub => {
            html += `
                <div class="goal-item glass-inner flex-between" style="flex-direction: row; margin-bottom: 0.8rem; padding: 1rem;">
                    <div>
                        <h4 style="margin-bottom: 5px;"><i class="fa-solid fa-cube text-secondary"></i> &nbsp; ${sub.title}</h4>
                        <p class="text-secondary" style="font-size: 0.85rem;">Renews: ${new Date(sub.nextBillingDate).toLocaleDateString()}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 1.2rem; font-weight: 700;">₹${sub.amount.toLocaleString()}</span>
                        <p class="text-secondary" style="font-size: 0.85rem;">/${sub.billingCycle === 'yearly' ? 'yr' : 'mo'}</p>
                    </div>
                </div>
            `;
        });
        document.getElementById("subsContainer").innerHTML = html;
    }
}// Authentication Modal Logic
let isLoginMode = true;

document.addEventListener("DOMContentLoaded", () => {
    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;
            const name = document.getElementById('authName').value;

            const endpoint = isLoginMode ? '/login' : '/register';
            const body = isLoginMode ? { email, password } : { name, email, password };

            try {
                const res = await fetch(`http://localhost:5050/api/auth${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const data = await res.json();
                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    closeModal('authModal');
                    checkAuthStatus();
                    fetchAllData();
                    Swal.fire({ title: 'Success', text: 'Authentication successful', icon: 'success', background: '#111827', color: '#fff' });
                } else {
                    Swal.fire({ title: 'Error', text: data.message, icon: 'error', background: '#111827', color: '#fff' });
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    const goalForm = document.getElementById('goalForm');
    if (goalForm) {
        goalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('goalTitle').value;
            const targetAmount = document.getElementById('goalAmount').value;
            const targetDate = document.getElementById('goalDate').value;

            try {
                const res = await fetch('http://localhost:5050/api/goals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ title, targetAmount, targetDate })
                });

                if (res.ok) {
                    Swal.fire({ title: 'Goal Created', icon: 'success', background: '#111827', color: '#fff', timer: 1500 });
                    toggleGoalForm();
                    goalForm.reset();
                    fetchGoals();
                } else if (res.status === 401) {
                    Swal.fire({ title: 'Authentication Required', icon: 'warning', background: '#111827', color: '#fff' });
                }
            } catch (e) { console.error(e); }
        });
    }


});

function checkAuthStatus() {
    const userStr = localStorage.getItem('user');
    const userNameEl = document.querySelector('.user-name');
    const authBtnEl = document.querySelector('.auth-btn');

    if (userStr && userNameEl) {
        const user = JSON.parse(userStr);
        userNameEl.innerText = user.name;

        if (authBtnEl) {
            authBtnEl.innerHTML = `Dashboard Active <i class="fa-solid fa-check-circle text-success" style="font-size: 0.7rem; margin-left: 2px;"></i>`;
            authBtnEl.classList.remove('highlight');
            authBtnEl.style.color = 'var(--success)';

            // Redirect to settings instead of login when logged in
            document.getElementById('profileBadge').onclick = () => {
                Swal.fire({
                    title: 'Profile Options',
                    text: 'Account settings coming soon.',
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Log Out',
                    cancelButtonText: 'Close',
                    background: '#111827',
                    color: '#fff'
                }).then((result) => {
                    if (result.isConfirmed) {
                        logout();
                    }
                });
            };
        }
    } else if (userNameEl) {
        userNameEl.innerText = 'Guest User';
        if (authBtnEl) {
            authBtnEl.innerHTML = `Sign In / Register <i class="fa-solid fa-arrow-right" style="font-size: 0.7rem; margin-left: 2px;"></i>`;
            document.getElementById('profileBadge').onclick = () => window.location.href = 'login.html';
        }
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    checkAuthStatus();
    window.location.reload();
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('authTitle');
    const nameGroup = document.getElementById('nameGroup');
    const submitBtn = document.getElementById('authSubmitBtn');
    const switchText = document.getElementById('authSwitchText');
    const switchLink = document.getElementById('authSwitchLink');

    if (isLoginMode) {
        title.innerHTML = `Secure <span class="highlight">Access</span>`;
        nameGroup.style.display = 'none';
        document.getElementById('authName').removeAttribute('required');
        submitBtn.innerHTML = `Login securely <i class="fa-solid fa-lock"></i>`;
        switchText.innerText = "Don't have an account?";
        switchLink.innerText = "Create one";
    } else {
        title.innerHTML = `Create <span class="highlight">Account</span>`;
        nameGroup.style.display = 'block';
        document.getElementById('authName').setAttribute('required', 'true');
        submitBtn.innerHTML = `Sign Up <i class="fa-solid fa-user-plus"></i>`;
        switchText.innerText = "Already have an account?";
        switchLink.innerText = "Login here";
    }
}

// Real Gmail Sync Hook
function connectGmail() {
    const token = localStorage.getItem('token');

    if (!token) {
        return Swal.fire({ title: 'Authentication Required', text: 'Please login to sync Gmail.', icon: 'warning', background: '#111827', color: '#fff' });
    }

    Swal.fire({
        title: 'Authenticating...',
        text: 'Initiating secure OAuth2 connection to Gmail...',
        icon: 'info',
        background: '#111827',
        color: '#fff',
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
            setTimeout(() => {
                window.location.href = `http://localhost:5050/auth/google?token=${token}`;
            }, 1000);
        }
    });
}

// AI Copilot Logic
function toggleChatbot() {
    const window = document.getElementById('chatbotWindow');
    window.style.display = window.style.display === 'none' ? 'flex' : 'none';
    if (window.style.display === 'flex') {
        document.getElementById('chatInput').focus();
    }
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    const messagesContainer = document.getElementById('chatbotMessages');

    // Add user message with avatar
    messagesContainer.innerHTML += `
        <div class="chat-msg user-msg">
            <div class="chat-text">${message}</div>
            <div class="chat-avatar"><i class="fa-solid fa-user"></i></div>
        </div>
    `;
    input.value = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Show typing indicator
    const typingId = 'typing-' + Date.now();
    messagesContainer.innerHTML += `
        <div class="chat-msg bot-msg" id="${typingId}">
            <div class="chat-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Simulate AI Server processing delay
    setTimeout(() => {
        simulateTypingAndRespond(message, typingId, messagesContainer);
    }, 1200 + Math.random() * 800);
}

function simulateTypingAndRespond(userMessage, typingId, container) {
    const lowerMsg = userMessage.toLowerCase();
    let reply = "";

    if (lowerMsg.includes("spend") || lowerMsg.includes("expense") || lowerMsg.includes("how much")) {
        const totalExp = document.getElementById("expense") ? document.getElementById("expense").innerText : "₹0";
        reply = `Based on your live ledger, you've spent an aggregate of **${totalExp}** this billing cycle. Would you like me to run an anomaly forensic scan?`;
    } else if (lowerMsg.includes("save") || lowerMsg.includes("runway") || lowerMsg.includes("stress")) {
        const stressForecast = document.getElementById("stressDateForecast") ? document.getElementById("stressDateForecast").innerText : "unknown days";
        reply = `I ran a burn-rate stress test. At your current spending velocity, your liquid runway is exactly **${stressForecast}**. I highly recommend utilizing the What-If Simulator on the Forensics tab.`;
    } else if (lowerMsg.includes("invest") || lowerMsg.includes("allocation")) {
        reply = "Looking at your FinHealth Score, my auto-allocation engine suggests a high-growth strategy: **50% Equity, 30% Debt, and 20% Gold**. You can review the exact visual breakdown in the Smart Investments tab.";
    } else if (lowerMsg.includes("loan") || lowerMsg.includes("emi")) {
        reply = "I can calculate Debt-to-Income (DTI) affordability for you in real time. Please navigate to the **Loans & EMI** tab to plug in your exact principal and tenure.";
    } else if (lowerMsg.includes("hello") || lowerMsg.includes("hi")) {
        reply = "Hello! I am your FinAI Copilot. I have full read-access to your financial telemetry. Try asking me about your burn rate, investment allocations, or overall health score!";
    } else {
        reply = "That's an insightful query. I'm cross-referencing your ledger history against our NLP parameters. To give you the most accurate projection, could you specify if you are asking about spending, investing, or runway?";
    }

    // Remove typing indicator
    const typingElement = document.getElementById(typingId);
    if (typingElement) typingElement.remove();

    // Add Bot Message container
    const msgId = 'msg-' + Date.now();
    container.innerHTML += `
        <div class="chat-msg bot-msg">
            <div class="chat-avatar"><i class="fa-solid fa-sparkles"></i></div>
            <div class="chat-text" id="${msgId}"></div>
        </div>
    `;

    // Typewriter effect
    const textElement = document.getElementById(msgId);
    let i = 0;
    const speed = 25; // ms per char

    function typeWriter() {
        if (i < reply.length) {
            // Handle basic markdown bolding
            if (reply.charAt(i) === '*' && reply.charAt(i + 1) === '*') {
                let boldText = "";
                i += 2;
                while (i < reply.length && !(reply.charAt(i) === '*' && reply.charAt(i + 1) === '*')) {
                    boldText += reply.charAt(i);
                    i++;
                }
                i += 2; // skip closing **
                textElement.innerHTML += `<strong>${boldText}</strong>`;
            } else {
                textElement.innerHTML += reply.charAt(i);
                i++;
            }
            container.scrollTop = container.scrollHeight;
            setTimeout(typeWriter, speed);
        }
    }

    typeWriter();
}

// Analytics Logic
async function fetchAnalytics() {
    const canvas = document.getElementById("trendChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (trendChartInstance) trendChartInstance.destroy();

    const data = [12000, 15000, 11000, 18000, 14000, 16000];
    trendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Monthly Burn',
                data: data,
                backgroundColor: '#3b82f6',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af' } },
                x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
            }
        }
    });

    // Render Financial Stability Radar Chart
    const radarCanvas = document.getElementById("radarChart");
    if (radarCanvas) {
        const radarCtx = radarCanvas.getContext("2d");
        if (radarChartInstance) radarChartInstance.destroy();

        radarChartInstance = new Chart(radarCtx, {
            type: 'radar',
            data: {
                labels: ['Liquidity', 'Saving Rate', 'Debt to Income', 'Growth Rate', 'Diversification'],
                datasets: [{
                    label: 'Current Status',
                    data: [85, 90, 75, 60, 80], // Example data
                    fill: true,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: '#3b82f6',
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#3b82f6'
                }, {
                    label: 'Target Benchmark',
                    data: [95, 80, 90, 85, 90], // Example benchmark
                    fill: true,
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderColor: '#10b981',
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    borderDash: [5, 5]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255,255,255,0.1)' },
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        pointLabels: { color: '#9ca3af', font: { family: "'Outfit'", size: 11 } },
                        ticks: { display: false, max: 100, min: 0 }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#e5e7eb', padding: 15, font: { family: "'Outfit'", size: 11 } }
                    }
                }
            }
        });
    }

    // Populate AI Summary
    document.getElementById("aiSummaryText").innerHTML = `
        <p>Your spending has increased by <strong>12%</strong> compared to last month.</p>
        <p class="mt-1">Primary driver: <strong>Subscriptions</strong> (₹4,500).</p>
        <p class="mt-1">Recommendation: You have 3 unused streaming services. Cancelling them could save you ₹12,000 annually.</p>
    `;
}

function generateAIReport() {
    Swal.fire({
        title: 'Generating Professional Report',
        text: 'Our AI is compiling your financial behavior into a PDF...',
        icon: 'info',
        background: '#111827',
        color: '#fff',
        timer: 3000,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
            setTimeout(() => {
                Swal.fire({
                    title: 'Report Ready',
                    text: 'Your June 2026 Financial Insight Report has been generated.',
                    icon: 'success',
                    confirmButtonText: 'Download PDF',
                    background: '#111827',
                    color: '#fff'
                });
            }, 3000);
        }
    });
}

// Investments Auto-Allocation Engine
function allocateInvestments() {
    Swal.fire({
        title: 'Analyzing Profile',
        text: 'AI is computing your optimal asset allocation based on risk parameters...',
        icon: 'info',
        background: '#111827',
        color: '#fff',
        timer: 1500,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    }).then(() => {
        // AI Logic simulation
        const healthScore = parseInt(document.getElementById("healthScore").innerText) || 85;
        let equity = 50, debt = 30, gold = 20;

        if (healthScore > 80) {
            equity = 70; debt = 20; gold = 10;
        } else if (healthScore < 50) {
            equity = 20; debt = 60; gold = 20;
        }

        // Update UI
        document.getElementById("allocEquity").innerText = `${equity}%`;
        document.getElementById("allocDebt").innerText = `${debt}%`;
        document.getElementById("allocGold").innerText = `${gold}%`;

        // Render Chart
        const canvas = document.getElementById("investmentChart");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        if (investmentChartInstance) investmentChartInstance.destroy();

        investmentChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Equity', 'Debt', 'Gold'],
                datasets: [{
                    data: [equity, debt, gold],
                    backgroundColor: ['#3b82f6', '#f59e0b', '#fbbf24'],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#e5e7eb', padding: 10, font: { family: "'Outfit'", size: 12 } }
                    }
                }
            }
        });
    });
}

// EMI Affordability Calculator Logic
function calculateEMI() {
    const P = parseFloat(document.getElementById('emiPrincipal').value);
    const rateAnnual = parseFloat(document.getElementById('emiRate').value);
    const years = parseFloat(document.getElementById('emiYears').value);
    const feePercent = parseFloat(document.getElementById('emiFee').value) || 0;

    if (!P || !rateAnnual || !years) {
        return Swal.fire({ title: 'Missing Details', text: 'Please fill in Principal, Rate, and Tenure.', icon: 'warning', background: '#111827', color: '#fff' });
    }

    const R = rateAnnual / 12 / 100; // Monthly interest rate
    const N = years * 12; // Total number of months

    // EMI Formula: P * R * (1+R)^N / ((1+R)^N - 1)
    const emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);

    const totalAmount = emi * N;
    const totalInterest = totalAmount - P;
    const processingFee = (P * feePercent) / 100;

    // Update UI Results
    document.getElementById('emiResult').innerText = `₹${Math.round(emi).toLocaleString()}`;
    document.getElementById('emiTotalPrincipal').innerText = `₹${Math.round(P).toLocaleString()}`;
    document.getElementById('emiTotalInterest').innerText = `₹${Math.round(totalInterest).toLocaleString()}`;
    document.getElementById('emiTotalFee').innerText = `₹${Math.round(processingFee).toLocaleString()}`;

    // Affordability Insight Logic
    const alertBox = document.getElementById('emiAffordabilityAlert');
    const alertText = document.getElementById('emiAffordabilityText');
    alertBox.style.display = 'block';

    // Get user's monthly income for analysis (fallback to 0 if not calculated)
    const incomeStr = document.getElementById('income').innerText.replace(/[^0-9]/g, '');
    const monthlyIncome = incomeStr ? parseInt(incomeStr) : 0;

    if (monthlyIncome > 0) {
        const dti = (emi / monthlyIncome) * 100;
        if (dti > 40) {
            alertBox.style.borderLeftColor = 'var(--danger)';
            alertText.innerHTML = `⚠️ <strong>High Risk:</strong> This EMI is <strong>${dti.toFixed(1)}%</strong> of your stated monthly income. Banks generally reject applications where Debt-to-Income (DTI) exceeds 40%.`;
        } else if (dti > 20) {
            alertBox.style.borderLeftColor = 'var(--warning)';
            alertText.innerHTML = `⚠️ <strong>Moderate Risk:</strong> This EMI is <strong>${dti.toFixed(1)}%</strong> of your income. It is affordable, but limits future borrowing capacity.`;
        } else {
            alertBox.style.borderLeftColor = 'var(--success)';
            alertText.innerHTML = `✅ <strong>Excellent Affordability:</strong> This EMI is only <strong>${dti.toFixed(1)}%</strong> of your income, keeping you well within safe borrowing limits.`;
        }
    } else {
        alertBox.style.borderLeftColor = 'var(--accent-blue)';
        alertText.innerHTML = `💡 <strong>Pro Tip:</strong> Add income to your ledger to unlock AI-driven Debt-to-Income (DTI) affordability scores!`;
    }
}

// ==========================================
// 10/10 WOW-FACTOR ADVANCED FEATURES
// ==========================================

// 1. Voice AI NLP Expense Parser
function startVoiceRecord() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        return Swal.fire('Unsupported Browser', 'Your browser does not support the Web Speech API. Try Chrome or Edge.', 'error');
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const voiceBtn = document.getElementById('voiceBtn');
    const originalText = voiceBtn.innerHTML;
    voiceBtn.innerHTML = '<i class="fa-solid fa-microphone fa-beat" style="color: var(--danger);"></i> Listening...';
    voiceBtn.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
    voiceBtn.style.borderColor = 'var(--danger)';
    voiceBtn.style.color = 'var(--danger)';

    recognition.start();

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log("Voice Transcript: ", transcript);

        // Basic NLP simulation: "Spent 500 on Amazon" or "Earned 2000 from salary"
        const amountMatch = transcript.match(/\d+/);
        let title = transcript.replace(/\d+/g, '').replace(/spent/g, '').replace(/earned/g, '').replace(/on /g, '').replace(/for /g, '').replace(/rupees/g, '').replace(/dollars/g, '').trim();

        // Capitalize first letter of title
        if (title.length > 0) title = title.charAt(0).toUpperCase() + title.slice(1);

        if (amountMatch) {
            document.getElementById('txAmount').value = amountMatch[0];
            document.getElementById('txTitle').value = title || "Voice Record";
            document.getElementById('txType').value = transcript.includes('earn') || transcript.includes('income') || transcript.includes('salary') ? 'income' : 'expense';

            Swal.fire({
                title: 'AI Voice Parsed!',
                html: `Recorded: <strong>${title || "Voice Record"}</strong> for <strong>₹${amountMatch[0]}</strong>`,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
                background: '#111827',
                color: '#fff'
            });
            // Automatically focus the button to submit
            document.querySelector('#expenseForm button[type="submit"]').focus();
        } else {
            Swal.fire('Could not understand', `You said: "${transcript}". Please try stating an amount clearly (e.g., "Spent 500 on Food").`, 'warning');
        }
    };

    recognition.onend = () => {
        voiceBtn.innerHTML = originalText;
        voiceBtn.style.backgroundColor = 'transparent';
        voiceBtn.style.borderColor = 'var(--purple)';
        voiceBtn.style.color = 'var(--purple)';
    };

    recognition.onerror = (event) => {
        voiceBtn.innerHTML = originalText;
        voiceBtn.style.backgroundColor = 'transparent';
        voiceBtn.style.borderColor = 'var(--purple)';
        voiceBtn.style.color = 'var(--purple)';
        console.error("Speech Rec Error:", event.error);
        if (event.error !== 'no-speech') Swal.fire('Error', 'Microphone error or permission denied.', 'error');
    };
}

// 2. 3D Interactive WebGL-style Card Tilt Logic
document.addEventListener('DOMContentLoaded', () => {
    const card = document.getElementById('smartCard');
    if (card) {
        const cardInner = card.querySelector('.card-inner');

        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Calculate mathematical rotation relative to mouse position
            const rotateX = ((y - centerY) / centerY) * -15; // Max 15 degree X tilt
            const rotateY = ((x - centerX) / centerX) * 15;  // Max 15 degree Y tilt

            cardInner.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        });

        card.addEventListener('mouseleave', () => {
            cardInner.style.transform = `rotateX(0deg) rotateY(0deg)`;
            cardInner.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        });

        card.addEventListener('mouseenter', () => {
            cardInner.style.transition = 'none'; // remove transition for instant track
        });
    }
});

// AI What-If Scenario Simulator Logic
function setupSimulationListeners() {
    const expenseSlider = document.getElementById('simExpenseReduction');
    const investSlider = document.getElementById('simInvestmentBoost');

    expenseSlider.addEventListener('input', (e) => {
        document.getElementById('simExpenseLabel').innerText = `${e.target.value}%`;
        runSimulation();
    });

    investSlider.addEventListener('input', (e) => {
        document.getElementById('simInvestLabel').innerText = `₹${parseInt(e.target.value).toLocaleString()}`;
        runSimulation();
    });
}

function runSimulation() {
    const canvas = document.getElementById("scenarioChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const expenseReduction = parseInt(document.getElementById('simExpenseReduction').value) || 0;
    const investBoost = parseInt(document.getElementById('simInvestmentBoost').value) || 0;

    // Base mock data for Baseline vs Simulated projection over 12 months
    const currentNetWorth = 500000;
    const baseMonthlySavings = 15000; // Baseline savings
    const averageExpense = 40000; // Estimated baseline monthly expense

    // Calculate new savings rate based on slider inputs
    const extraSavingsFromExpenseCut = averageExpense * (expenseReduction / 100);
    const newMonthlySavings = baseMonthlySavings + extraSavingsFromExpenseCut + investBoost;

    // Generate arrays for 12 months
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const baselineData = [];
    const projectedData = [];

    let currentBase = currentNetWorth;
    let currentProj = currentNetWorth;

    for (let i = 0; i < 12; i++) {
        // Normal 6% annual return for baseline
        currentBase = currentBase + baseMonthlySavings + (currentBase * (0.06 / 12));
        baselineData.push(Math.round(currentBase));

        // Projected 12% aggressive return on new investments
        currentProj = currentProj + newMonthlySavings + (currentProj * (0.12 / 12));
        projectedData.push(Math.round(currentProj));
    }

    const netDelta = currentProj - currentBase;
    const deltaEl = document.getElementById('simNetDelta');
    deltaEl.innerText = `+₹${Math.round(netDelta).toLocaleString()}`;

    if (scenarioChartInstance) scenarioChartInstance.destroy();

    scenarioChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Status Quo (Baseline)',
                    data: baselineData,
                    borderColor: '#6b7280',
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'AI Optimized Projection',
                    data: projectedData,
                    borderColor: '#10b981', // Success green
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointHoverRadius: 6,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)', // Match glass theme
                    titleColor: '#fff',
                    bodyColor: '#e5e7eb',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function (context) {
                            return `${context.dataset.label}: ₹${context.raw.toLocaleString()}`;
                        }
                    }
                },
                legend: {
                    position: 'top',
                    labels: { color: '#e5e7eb', font: { family: "'Outfit'", size: 12 } }
                }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af', callback: (val) => '₹' + (val / 1000) + 'k' } },
                x: { grid: { display: false }, ticks: { color: '#9ca3af' } }
            }
        }
    });
}