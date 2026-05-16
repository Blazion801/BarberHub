const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const db = require('./config/db'); // Brings in your MySQL connection

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
        const { name, email, password } = req.body;
        
        // Hash the password (Security Requirement)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert the user into the database you just built
        const [result] = await db.execute(
            'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        
        res.status(201).json({ message: 'Registration successful!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// 3. User Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Check if the email exists in the database
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Akun tidak ditemukan. Silakan daftar.' });
        }

        const user = users[0]; // Grab the first matched user

        // 2. Compare the typed password against the hashed password in the DB
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Password salah.' });
        }

        // 3. Generate the JSON Web Token (The Golden Ticket)
        const token = jwt.sign(
            { id: user.id, role: user.role, name: user.full_name },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 4. Send the token and user data back to Gavinn's frontend
        res.status(200).json({
            message: 'Login berhasil!',
            token: token,
            user: {
                id: user.id,
                name: user.full_name,
                email: user.email,
                role: user.role,
                life_count: user.life_count
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