const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const db = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Health Check Route
app.get('/api/status', (req, res) => {
    res.status(200).json({ message: 'BarberHub Backend is running successfully!' });
});

// 2. User Registration Route
app.post('/api/register', async (req, res) => {
    try {
        // GAVIN'S FIX: Extract whatsapp from the frontend request
        const { name, whatsapp, email, password } = req.body;
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // GAVIN'S FIX: Match the exact database columns we created in XAMPP
        const [result] = await db.execute(
            'INSERT INTO users (name, whatsapp, email, password) VALUES (?, ?, ?, ?)',
            [name, whatsapp, email, hashedPassword]
        );
        
        res.status(201).json({ message: 'Registration successful!' });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// 3. User Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Akun tidak ditemukan. Silakan daftar.' });
        }

        const user = users[0]; 

        // GAVIN'S FIX: Check against 'user.password', not 'password_hash'
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password salah.' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Login berhasil!',
            token: token,
            user: {
                id: user.id,
                name: user.name,
                whatsapp: user.whatsapp,
                email: user.email,
                role: user.role,
                life_count: 3 // Defaulting to 3 based on your SRS REQ-4.1
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error saat login.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});