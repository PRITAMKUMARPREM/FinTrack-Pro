<div align="center">
  <img src="https://img.shields.io/badge/FinTrack-Pro-3b82f6?style=for-the-badge&logo=bolt&logoColor=white" alt="FinTrack Pro Logo">
  <h1>FinTrack Pro</h1>
  <p><strong>A Modern AI-Powered Personal Finance & Wealth Management Dashboard</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js">
    <img src="https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white" alt="Express">
    <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB">
    <img src="https://img.shields.io/badge/HTML5_&_CSS3-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5 & CSS3">
    <img src="https://img.shields.io/badge/Chart.js-FF6384?style=flat-square&logo=chartdotjs&logoColor=white" alt="Chart.js">
  </p>
</div>

---

## 🚀 Overview

**FinTrack Pro** is a comprehensive, full-stack financial management SaaS designed to help users take complete control over their money. Beyond basic income and expense tracking, it acts as an intelligent financial co-pilot—featuring predictive AI budgeting, automated subscription detection through Gmail sync, goal planning, and real-time net-worth analytics.

Designed with a sleek, premium _glassmorphism_ UI, FinTrack Pro turns raw financial data into beautiful, actionable insights, making wealth building an intuitive and highly engaging experience.

## ✨ Core Features

*   **💳 3D Interactive Dashboard:** A highly visual, real-time command center displaying your liquid balances, burn rate, and a dynamic FinHealth score. 
*   **📧 Automated Gmail Sync Engine:** Connects to your Gmail inbox via securely handled OAuth to automatically parse bank alerts, extracting expenses, incomes, and recurring subscriptions directly into the ledger using advanced Regex scraping. 
*   **📊 Deep Analytics & Charting:** Interactive visualizations powered by Chart.js. Track spending distribution by categories (Food, Subscriptions, Utilities) and monitor historical net-worth growth.
*   **🎯 Intelligent Milestones:** Set and track custom savings goals (e.g., "Emergency Fund", "New Car"). When the auto-sync engine detects savings, it intelligently routes and updates specific goal progress rings.
*   **🔁 Subscription Tracker:** AI-driven dashboard that flags auto-renewing subscriptions and helps prevent "zombie" recurring charges (like Spotify or Netflix).
*   **🧠 Behavioral AI Forensics:** Analyzes your spending velocity to provide "burn-rate" stress tests (e.g., "22 days until extinction") and categorizes user behavior to offer personalized financial advice.
*   **🔒 Secure Local Authentication:** robust backend user registration with JWT standard and fully encrypted passwords ensuring user specific data isolation.

## 🛠️ Technology Stack

FinTrack Pro is built as a highly performant, server-rendered progressive web application leveraging the following technologies:

### **Frontend:**
*   **HTML5 / CSS3 (Vanilla):** For incredibly fast loading speeds without the bloat of heavy structural frameworks. Includes advanced CSS animations, grid layouts, and custom `glass-panel` themes.
*   **Vanilla JavaScript (ES6+):** Orchestrates DOM manipulation, handles modal overlays, interacts with the backend REST APIs, and processes the AI simulation algorithms on the client-side.
*   **Chart.js:** Renders the responsive donut, pie, and line charts dynamically.
*   **SweetAlert2:** For beautifully themed, non-intrusive alert popups and notifications.
*   **FontAwesome:** For all crisp, scalable vector iconography.

### **Backend:**
*   **Node.js / Express.js:** The core runtime environment and highly efficient routing framework handling API endpoints securely.
*   **MongoDB & Mongoose:** A NoSQL database storing user profiles, individual expenses, goals, and subscription metadata reliably.
*   **Google APIs (`googleapis`):** Handles the secure OAuth 2.0 flow to give users the option to sync bank receipts straight from Gmail without exposing raw login credentials. 
*   **Authentication (`jsonwebtoken`, `bcryptjs`):** Ensures encrypted user security and protected REST API endpoints.

## ⚙️ Local Installation & Setup

Want to run this locally? Make sure you have **Node.js** and **MongoDB** installed on your machine.

**1. Clone the repository:**
```bash
git clone https://github.com/PRITAMKUMARPREM/FinTrack-Pro.git
cd FinTrack-Pro
```

**2. Install Backend Dependencies:**
```bash
npm install
```

**3. Configure Environment Variables:**
Create a `.env` file in the root directory and define the following variables:
```env
SESSION_SECRET=your_secure_session_secret
JWT_SECRET=your_secure_jwt_secret
MONGODB_URI=mongodb://127.0.0.1:27017/expenseTracker  # Or Atlas URI
CLIENT_ID=your_google_cloud_client_id                 # For Gmail Sync
CLIENT_SECRET=your_google_cloud_client_secret         # For Gmail Sync
REDIRECT_URI=http://localhost:5050/auth/google/callback
```

**4. Start the Application:**
```bash
npm start
```
The server will boot up and the application will be accessible at `http://localhost:5050`.

## ☁️ Deployment Ready
This project includes a `render.yaml` configuration file allowing for **zero-configuration** automated deployments to Render.com.

---
*Developed with a passion for beautiful engineering.*
