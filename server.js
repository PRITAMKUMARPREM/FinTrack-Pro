require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");

const expenseRoutes = require("./routes/expenseRoutes");
const authRoutes = require("./routes/authRoutes");
const goalRoutes = require("./routes/goalRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const gmailRoutes = require("./gmailRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

// Attempt MongoDB Connection but do not crash if it fails
mongoose.connect("mongodb://127.0.0.1:27017/expenseTracker")
    .then(() => console.log("MongoDB Connected"))
    .catch(err => {
        console.warn("⚠️  MongoDB is not running locally (Connection Refused).");
        console.warn("⚠️  Starting server in 'Offline' mode. Data will not be saved.");
    });

app.use("/api/expenses", expenseRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/auth", gmailRoutes);

app.listen(5050, () => console.log("Server running on port 5050"));