const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// --- UPLOAD ENGINE SETUP ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES ---

// 1. Health Check
app.get('/api/status', (req, res) => res.status(200).json({ message: 'Backend running!' }));

// 2. User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, whatsapp, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute(
            'INSERT INTO users (full_name, whatsapp, email, password_hash) VALUES (?, ?, ?, ?)',
            [name, whatsapp, email, hashedPassword]
        );
        res.status(201).json({ message: 'Registration successful!' });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// 3. User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email dan password wajib diisi.' });

        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'Akun tidak ditemukan. Silakan daftar.' });

        const user = users[0]; 
        const isMatch = await bcrypt.compare(String(password), String(user.password_hash));
        if (!isMatch) return res.status(401).json({ message: 'Password salah.' });

        const token = jwt.sign({ id: user.id, role: user.role, name: user.full_name }, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.status(200).json({
            message: 'Login berhasil!',
            token: token,
            user: { id: user.id, name: user.full_name, whatsapp: user.whatsapp, email: user.email, role: user.role, life_count: user.life_count }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error saat login.' });
    }
});

// 4. Get All Active Barbers
app.get('/api/barbers', async (req, res) => {
    try {
        const [barbers] = await db.execute(`
            SELECT id, full_name AS name, CONCAT(specialty, ' • ', experience_years, ' Thn Pengalaman • Rp ', FORMAT(price, 0)) AS specialty,
            overall_rating AS rating, status, photo_url AS image 
            FROM barbers WHERE status = "Active"
        `);
        res.status(200).json(barbers);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data barber.' });
    }
});

// 5. Create Barber 
app.post('/api/barbers', upload.single('image'), async (req, res) => {
    try {
        const { fullName, specialty, experienceYears, price } = req.body;
        if (!req.file) return res.status(400).json({ message: 'Foto wajib diupload.' });
        const photoUrl = `http://localhost:5000/uploads/${req.file.filename}`;

        await db.execute(
            'INSERT INTO barbers (full_name, specialty, experience_years, price, photo_url, status, overall_rating) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [fullName, specialty, experienceYears, price, photoUrl, 'Active', 5.0]
        );
        res.status(201).json({ message: 'Barber berhasil ditambahkan!' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal menambahkan barber.' });
    }
});

// 6. Availability Engine (Lazy Loading)
app.get('/api/availability', async (req, res) => {
    try {
        const { barberId, date } = req.query;
        if (!barberId || !date) return res.status(400).json({ message: 'Barber ID dan Tanggal wajib diisi.' });

        const [existingSlots] = await db.execute('SELECT start_time, status FROM time_slots WHERE barber_id = ? AND slot_date = ?', [barberId, date]);

        if (existingSlots.length === 0) {
            for (let hour = 9; hour <= 19; hour++) {
                const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
                const endTime = `${(hour + 1).toString().padStart(2, '0')}:00:00`;
                await db.execute(
                    'INSERT INTO time_slots (barber_id, slot_date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)',
                    [barberId, date, startTime, endTime, 'Available']
                );
            }
        }

        const [finalSlots] = await db.execute('SELECT start_time, status FROM time_slots WHERE barber_id = ? AND slot_date = ?', [barberId, date]);
        const availableTimes = finalSlots.filter(slot => slot.status === 'Available').map(slot => slot.start_time);
        res.status(200).json(availableTimes);
    } catch (error) {
        res.status(500).json({ message: 'Gagal memuat jadwal.' });
    }
});

// 7. Create a New Booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { customerId, barberId, date, time } = req.body;
        if (!customerId || !barberId || !date || !time) return res.status(400).json({ message: 'Data booking tidak lengkap.' });

        const [slots] = await db.execute('SELECT id FROM time_slots WHERE barber_id = ? AND slot_date = ? AND start_time = ?', [barberId, date, time]);
        if (slots.length === 0) return res.status(404).json({ message: 'Slot waktu tidak ditemukan atau sudah penuh.' });
        const timeSlotId = slots[0].id;

        await db.execute('INSERT INTO bookings (customer_id, time_slot_id, status) VALUES (?, ?, ?)', [customerId, timeSlotId, 'Upcoming']);
        await db.execute('UPDATE time_slots SET status = ? WHERE id = ?', ['Booked', timeSlotId]);

        res.status(201).json({ message: 'Booking berhasil dikonfirmasi!' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal melakukan booking.' });
    }
});

// 8. Get Customer Booking History (WITH THE FIX)
app.get('/api/bookings/customer/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;
        const [history] = await db.execute(`
            SELECT 
                b.id, 
                ts.slot_date AS booking_date, 
                ts.start_time, 
                b.status, 
                bar.full_name AS barber_name, 
                bar.photo_url AS barber_image
            FROM bookings b
            JOIN time_slots ts ON b.time_slot_id = ts.id
            JOIN barbers bar ON ts.barber_id = bar.id   
            WHERE b.customer_id = ?
            ORDER BY ts.slot_date DESC, ts.start_time DESC
        `, [customerId]);
        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ message: 'Gagal memuat riwayat booking.' });
    }
});

// 9. Cancel a Booking (Handles status updates & life count deduction)
app.put('/api/bookings/cancel', async (req, res) => {
    try {
        const { bookingId, customerId } = req.body;
        if (!bookingId || !customerId) return res.status(400).json({ message: 'Booking ID dan Customer ID wajib diisi.' });

        const [bookings] = await db.execute(
            'SELECT time_slot_id FROM bookings WHERE id = ? AND customer_id = ? AND status = "Upcoming"',
            [bookingId, customerId]
        );
        if (bookings.length === 0) return res.status(404).json({ message: 'Booking tidak ditemukan atau sudah tidak bisa dibatalkan.' });
        const timeSlotId = bookings[0].time_slot_id;

        await db.execute('UPDATE bookings SET status = "Cancelled" WHERE id = ?', [bookingId]);
        await db.execute('UPDATE time_slots SET status = "Available" WHERE id = ?', [timeSlotId]);
        await db.execute('UPDATE users SET life_count = life_count - 1 WHERE id = ?', [customerId]);

        res.status(200).json({ message: 'Booking berhasil dibatalkan. Kesempatan batal Anda berkurang 1.' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal membatalkan booking.' });
    }
});

// 9. Cancel a Booking (Handles status updates & SMART 3-Hour Life Deduction)
app.put('/api/bookings/cancel', async (req, res) => {
    try {
        const { bookingId, customerId } = req.body;
        if (!bookingId || !customerId) return res.status(400).json({ message: 'Booking ID dan Customer ID wajib diisi.' });

        // 1. Fetch booking AND the time slot details so we can check the time
        const [bookings] = await db.execute(`
            SELECT b.time_slot_id, ts.slot_date, ts.start_time 
            FROM bookings b 
            JOIN time_slots ts ON b.time_slot_id = ts.id 
            WHERE b.id = ? AND b.customer_id = ? AND b.status = "Upcoming"
        `, [bookingId, customerId]);

        if (bookings.length === 0) return res.status(404).json({ message: 'Booking tidak ditemukan atau sudah dibatalkan.' });
        
        const timeSlotId = bookings[0].time_slot_id;
        
        // 2. Calculate the time difference (Backend Validation)
        const slotDate = new Date(bookings[0].slot_date).toISOString().split('T')[0];
        const appointmentTime = new Date(`${slotDate}T${bookings[0].start_time}`);
        const now = new Date();
        const diffInHours = (appointmentTime - now) / (1000 * 60 * 60);

        // 3. Free up the schedule & Mark booking as Cancelled
        await db.execute('UPDATE bookings SET status = "Cancelled" WHERE id = ?', [bookingId]);
        await db.execute('UPDATE time_slots SET status = "Available" WHERE id = ?', [timeSlotId]);

        // 4. THE 3-HOUR RULE EXECUTION
        if (diffInHours < 3) {
            // Under 3 hours? DEDUCT A LIFE!
            await db.execute('UPDATE users SET life_count = life_count - 1 WHERE id = ?', [customerId]);
            res.status(200).json({ message: 'Booking dibatalkan. (Penalti: Waktu < 3 Jam, Kredit Kursi -1)' });
        } else {
            // Over 3 hours? FREE PASS!
            res.status(200).json({ message: 'Booking dibatalkan. (Aman: Kredit kursi tidak berkurang)' });
        }

    } catch (error) {
        console.error('Cancel Error:', error);
        res.status(500).json({ message: 'Gagal membatalkan booking.' });
    }
});

// 10. Get Fresh User Data (Fixes the Life Count UI bug)
app.get('/api/users/:id', async (req, res) => {
    try {
        const [users] = await db.execute('SELECT life_count FROM users WHERE id = ?', [req.params.id]);
        if (users.length === 0) return res.status(404).json({ message: 'User not found' });
        res.status(200).json(users[0]);
    } catch (error) {
        res.status(500).json({ message: 'Gagal memuat data user.' });
    }
});

// 11. Admin: Get Daily Operations Schedule
app.get('/api/admin/bookings', async (req, res) => {
    try {
        const { date } = req.query;
        const [bookings] = await db.execute(`
            SELECT 
                b.id, b.status, b.customer_id, 
                u.full_name AS customer_name, u.whatsapp AS customer_phone,
                ts.start_time, bar.full_name AS barber_name
            FROM bookings b
            JOIN users u ON b.customer_id = u.id
            JOIN time_slots ts ON b.time_slot_id = ts.id
            JOIN barbers bar ON ts.barber_id = bar.id
            WHERE ts.slot_date = ?
            ORDER BY ts.start_time ASC
        `, [date]);
        res.status(200).json(bookings);
    } catch (error) {
        console.error('Admin Bookings Error:', error);
        res.status(500).json({ message: 'Gagal memuat jadwal harian.' });
    }
});

// 12. Admin: Mark Booking as Completed or No-Show
app.put('/api/admin/bookings/status', async (req, res) => {
    try {
        const { bookingId, status, customerId } = req.body;
        
        // Update the booking status
        await db.execute('UPDATE bookings SET status = ? WHERE id = ?', [status, bookingId]);

        // THE NO-SHOW PENALTY RULE
        if (status === 'No-Show') {
            await db.execute('UPDATE users SET life_count = life_count - 1 WHERE id = ?', [customerId]);
        }

        res.status(200).json({ message: `Booking berhasil diupdate menjadi ${status}!` });
    } catch (error) {
        console.error('Admin Status Update Error:', error);
        res.status(500).json({ message: 'Gagal mengupdate status.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});