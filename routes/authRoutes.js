const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'fintrack_super_secret_jwt_key_2026';

// Register User
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        try {
            // Attempt Real MongoDB Operation
            let user = await User.findOne({ email });
            if (user) return res.status(400).json({ message: 'User already exists' });

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = new User({ name, email, password: hashedPassword });
            await user.save();

            const payload = { user: { id: user.id } };
            jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
                if (err) throw err;
                res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
            });
        } catch (dbErr) {
            console.warn("⚠️ MongoDB Offline - Registering to In-Memory Storage");
            global.mockUsers = global.mockUsers || [];

            const existingMock = global.mockUsers.find(u => u.email === email);
            if (existingMock) return res.status(400).json({ message: 'User already exists' });

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const mockUser = { id: `mock_${Date.now()}`, name, email, password: hashedPassword };
            global.mockUsers.push(mockUser);

            const payload = { user: { id: mockUser.id } };
            jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
                if (err) throw err;
                res.status(201).json({ token, user: { id: mockUser.id, name: mockUser.name, email: mockUser.email } });
            });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Login User
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        try {
            // Attempt Real MongoDB Operation
            const user = await User.findOne({ email });
            if (!user) return res.status(400).json({ message: 'Invalid Credentials' });

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

            const payload = { user: { id: user.id } };
            jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
                if (err) throw err;
                res.status(200).json({ token, user: { id: user.id, name: user.name, email: user.email } });
            });
        } catch (dbErr) {
            console.warn("⚠️ MongoDB Offline - Logging in via In-Memory Storage");
            global.mockUsers = global.mockUsers || [];

            const mockUser = global.mockUsers.find(u => u.email === email);
            if (!mockUser) return res.status(400).json({ message: 'Invalid Credentials' });

            const isMatch = await bcrypt.compare(password, mockUser.password);
            if (!isMatch) return res.status(400).json({ message: 'Invalid Credentials' });

            const payload = { user: { id: mockUser.id } };
            jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
                if (err) throw err;
                res.status(200).json({ token, user: { id: mockUser.id, name: mockUser.name, email: mockUser.email } });
            });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get Current User (Protected)
router.get('/me', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.user.id).select('-password');

        res.json(user);
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
});

module.exports = router;
