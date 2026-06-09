const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cron = require("node-cron"); 
const nodemailer = require("nodemailer");
const crypto = require("crypto"); 
const db = require("./config/db");

const app = express();

// --- CORS CONFIGURATION (THE FINAL FIX) ---
const allowedOrigins = [
  'http://localhost:5173', 
  process.env.FRONTEND_URL, 
  'https://barberhub-mu.vercel.app', 
  'https://barberhub-a5klqp46a-blazions-projects.vercel.app' 
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- UPLOAD ENGINE SETUP ---
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "-"));
  },
});
const upload = multer({ storage: storage });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Format: "Bearer <TOKEN>"

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. Token not found." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Token is not valid or has expired." });
    }
    req.user = user; 
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res
      .status(403)
      .json({ message: "Access denied. Only for Admin role." });
  }
  next();
};

// --- ROUTES ---

// 1. Health Check
app.get("/api/status", (req, res) =>
  res.status(200).json({ message: "Backend running!" }),
);

// 2. User Registration
app.post("/api/register", async (req, res) => {
  try {
    const { name, whatsapp, email, password } = req.body;

    if (!name || !whatsapp || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters long." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute(
      "INSERT INTO users (full_name, whatsapp, email, password_hash, life_count, is_blocked) VALUES (?, ?, ?, ?, 3, false)",
      [name, whatsapp, email, hashedPassword],
    );

    res.status(201).json({ message: "Registration successful!" });
  } catch (error) {
    console.error("Registration Error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "Email already registered. Please use a different email.",
      });
    }
    res.status(500).json({ message: "Server error during registration." });
  }
});

// 3. User Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "Account not found. Please register." });
    }

    const user = users[0];

    if (user.is_blocked === 1 || user.is_blocked === true) {
      return res.status(403).json({
        message:
          "Your account has been suspended. Please contact the barbershop.",
      });
    }

    const isMatch = await bcrypt.compare(
      String(password),
      String(user.password_hash),
    );
    if (!isMatch) {
      return res.status(401).json({ message: "Password salah." });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.full_name },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.status(200).json({
      message: "Login berhasil!",
      token: token,
      user: {
        id: user.id,
        name: user.full_name,
        whatsapp: user.whatsapp,
        email: user.email,
        role: user.role,
        life_count: user.life_count,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});

// 4. Get All Active Barbers
app.get("/api/barbers", async (req, res) => {
  try {
    const [barbers] = await db.execute(`
            SELECT id, full_name AS name, CONCAT(specialty, ' • ', experience_years, ' Thn Pengalaman • Rp ', FORMAT(price, 0)) AS specialty,
            overall_rating AS rating, status, photo_url AS image 
            FROM barbers WHERE status = "Active"
        `);
    res.status(200).json(barbers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch barber data." });
  }
});

// 5. Create Barber (FIXED UPLOAD URL)
app.post("/api/barbers", upload.single("image"), async (req, res) => {
  try {
    const { fullName, specialty, experienceYears, price } = req.body;
    if (!req.file)
      return res.status(400).json({ message: "Photo is required." });
    
    // Engine Fix: Membuat URL gambar dinamis menyesuaikan environment (Railway atau Localhost)
    const photoUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    await db.execute(
      "INSERT INTO barbers (full_name, specialty, experience_years, price, photo_url, status, overall_rating) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [fullName, specialty, experienceYears, price, photoUrl, "Active", 5.0],
    );
    res.status(201).json({ message: "Barber successfully added!" });
  } catch (error) {
    res.status(500).json({ message: "Failed to add barber." });
  }
});

// 6. Availability Engine 
app.get("/api/availability", async (req, res) => {
  try {
    const { barberId, date } = req.query;
    if (!barberId || !date)
      return res
        .status(400)
        .json({ message: "Barber ID and Date are required." });

    const [existingSlots] = await db.execute(
      "SELECT start_time, status FROM time_slots WHERE barber_id = ? AND slot_date = ?",
      [barberId, date],
    );

    if (existingSlots.length === 0) {
      for (let hour = 9; hour <= 19; hour++) {
        const startTime = `${hour.toString().padStart(2, "0")}:00:00`;
        const endTime = `${(hour + 1).toString().padStart(2, "0")}:00:00`;
        await db.execute(
          "INSERT INTO time_slots (barber_id, slot_date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?)",
          [barberId, date, startTime, endTime, "Available"],
        );
      }
    }

    const [finalSlots] = await db.execute(
      "SELECT start_time, status FROM time_slots WHERE barber_id = ? AND slot_date = ?",
      [barberId, date],
    );
    
    const availableTimes = finalSlots
      .filter((slot) => {
        if (slot.status !== "Available") return false;
        
        const slotDateTime = new Date(`${date}T${slot.start_time}`);
        const now = new Date();
        return slotDateTime > now; 
      })
      .map((slot) => slot.start_time);
      
    res.status(200).json(availableTimes);
  } catch (error) {
    console.error("Availability Error:", error);
    res.status(500).json({ message: "Gagal memuat jadwal." });
  }
});

// 7. Create a New Booking
app.post("/api/bookings", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { customerId, barberId, date, time } = req.body;

    if (!customerId || !barberId || !date || !time) {
      return res.status(400).json({ message: "Data booking tidak lengkap." });
    }

    await connection.beginTransaction();

    const [users] = await connection.execute(
      "SELECT life_count, is_blocked, email, full_name FROM users WHERE id = ?",
      [customerId],
    );
    
    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Data pengguna tidak ditemukan." });
    }

    const user = users[0];
    if (user.is_blocked === 1 || user.life_count <= 0) {
      await connection.rollback();
      return res.status(403).json({
        message: "Booking rejected. Your account has been suspended due to exhausted booking credits (0 Lives).",
      });
    }

    const [slots] = await connection.execute(
      "SELECT id, status FROM time_slots WHERE barber_id = ? AND slot_date = ? AND start_time = ? FOR UPDATE",
      [barberId, date, time],
    );

    if (slots.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Time slot not available in the system." });
    }

    const slot = slots[0];
    if (slot.status !== "Available") {
      await connection.rollback();
      return res.status(409).json({
        message: "Sorry, this time slot was just booked by another customer.",
      });
    }

    const timeSlotId = slot.id;

    await connection.execute(
      "INSERT INTO bookings (customer_id, time_slot_id, status) VALUES (?, ?, ?)",
      [customerId, timeSlotId, "Upcoming"],
    );
    await connection.execute("UPDATE time_slots SET status = ? WHERE id = ?", [
      "Booked",
      timeSlotId,
    ]);

    await connection.commit();
    res.status(201).json({ message: "Booking berhasil dikonfirmasi!" });

    transporter.sendMail({
      from: `"BarberHub System" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Booking Confirmed! - BarberHub",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #d4af37;">Booking Berhasil, ${user.full_name}!</h2>
          <p>Jadwal potong rambut Anda telah dikonfirmasi ke dalam sistem.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
            <p style="margin: 5px 0;"><strong>Tanggal:</strong> ${date}</p>
            <p style="margin: 5px 0;"><strong>Waktu:</strong> ${time} WIB</p>
          </div>
          <p style="color: #ef4444; font-size: 0.9em; margin-top: 20px;">
            <em>*Penting: Mohon datang 10 menit lebih awal. Keterlambatan lebih dari 20 menit atau pembatalan mendadak akan mengurangi Booking Credit Anda.</em>
          </p>
        </div>
      `
    }).catch(err => console.error("Failed to send booking email:", err));

  } catch (error) {
    await connection.rollback();
    console.error("Booking Concurrency Error:", error);
    res.status(500).json({
      message: "Failed to make booking due to network concurrency issues.",
    });
  } finally {
    connection.release();
  }
});

// 8. Get Customer Booking History 
app.get("/api/bookings/customer/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    const [history] = await db.execute(
      `
            SELECT 
                b.id, 
                ts.slot_date AS booking_date, 
                ts.start_time, 
                b.status, 
                bar.full_name AS barber_name, 
                bar.photo_url AS barber_image,
                r.rating AS rating
            FROM bookings b
            JOIN time_slots ts ON b.time_slot_id = ts.id
            JOIN barbers bar ON ts.barber_id = bar.id   
            LEFT JOIN reviews r ON b.id = r.booking_id
            WHERE b.customer_id = ?
            ORDER BY ts.slot_date DESC, ts.start_time DESC
        `,
      [customerId],
    );
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to load booking history." });
  }
});

// 9. Cancel a Booking 
app.put("/api/bookings/cancel", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { bookingId, customerId } = req.body;
    if (!bookingId || !customerId)
      return res
        .status(400)
        .json({ message: "Booking ID and Customer ID are required." });

    await connection.beginTransaction();

    const [bookings] = await connection.execute(
      `
            SELECT b.time_slot_id, ts.slot_date, ts.start_time 
            FROM bookings b 
            JOIN time_slots ts ON b.time_slot_id = ts.id 
            WHERE b.id = ? AND b.customer_id = ? AND b.status = 'Upcoming'
        `,
      [bookingId, customerId],
    );

    if (bookings.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "Booking not found or cannot be cancelled.",
      });
    }

    const timeSlotId = bookings[0].time_slot_id;

    const rawDate = bookings[0].slot_date;
    const dateObj = new Date(rawDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    const appointmentTime = new Date(`${year}-${month}-${day}T${bookings[0].start_time}`);
    const now = new Date();
    
    const diffInHours = (appointmentTime - now) / (1000 * 60 * 60);

    await connection.execute(
      'UPDATE bookings SET status = "Cancelled" WHERE id = ?',
      [bookingId]
    );
    await connection.execute(
      'UPDATE time_slots SET status = "Available" WHERE id = ?',
      [timeSlotId]
    );

    if (diffInHours < 1 && diffInHours > 0) {
      await connection.execute(
        "UPDATE users SET life_count = life_count - 1 WHERE id = ?",
        [customerId]
      );

      const [userCheck] = await connection.execute(
        "SELECT life_count FROM users WHERE id = ?",
        [customerId],
      );
      if (userCheck[0].life_count <= 0) {
        await connection.execute(
          "UPDATE users SET is_blocked = true, life_count = 0 WHERE id = ?",
          [customerId],
        );
        await connection.commit();
        return res.status(200).json({
          message:
            "Booking successfully cancelled. Penalty: Cancellation within 3 hours, Credit -1. Your account has been automatically suspended.",
        });
      }

      await connection.commit();
      return res.status(200).json({
        message:
          "Booking successfully cancelled with penalty. (Penalty:Cancel in < 3 Jam, Credit -1)",
      });
    }

    await connection.commit();
    res
      .status(200)
      .json({ message: "Booking successfully cancelled without penalty (Safe)." });
  } catch (error) {
    await connection.rollback();
    console.error("Cancel Error:", error);
    res.status(500).json({ message: "Failed to cancel booking." });
  } finally {
    connection.release();
  }
});

// 10. Get Fresh User Data
app.get("/api/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const [users] = await db.execute(
      "SELECT id, full_name, whatsapp, email, life_count, is_blocked FROM users WHERE id = ?",
      [userId],
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(users[0]);
  } catch (error) {
    console.error("Get User Error:", error);
    res.status(500).json({ message: "Failed to fetch user data." });
  }
});

// 11. Admin: Get Daily Operations Schedule
app.get("/api/admin/bookings", async (req, res) => {
  try {
    const { date } = req.query;
    const [bookings] = await db.execute(
      `
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
        `,
      [date],
    );
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Admin Bookings Error:", error);
    res.status(500).json({ message: "Failed to load daily schedule." });
  }
});

// 12. Admin: Mark Booking as Completed, Late, or No-Show
app.put(
  "/api/admin/bookings/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const connection = await db.getConnection();
    try {
      const { bookingId, status, customerId } = req.body;

      if (!bookingId || !status || !customerId) {
        return res.status(400).json({ message: "Incomplete status update data." });
      }

      await connection.beginTransaction();

      await connection.execute("UPDATE bookings SET status = ? WHERE id = ?", [
        status,
        bookingId,
      ]);

      if (status === "No-Show" || status === "Telat > 20 Mnt") {
        await connection.execute(
          "UPDATE users SET life_count = life_count - 1 WHERE id = ?",
          [customerId],
        );

        const [users] = await connection.execute(
          "SELECT life_count, email, full_name FROM users WHERE id = ?",
          [customerId],
        );
        const currentLife = users[0].life_count;
        const userEmail = users[0].email;
        const userName = users[0].full_name;

        let emailSubject = currentLife <= 0 ? "🚨 ACCOUNT SUSPENDED - BarberHub" : "⚠️ PENALTY WARNING - BarberHub";
        let emailBody = currentLife <= 0 
          ? `<p>Halo <strong>${userName}</strong>,</p><p>Sistem kami mencatat Anda <strong>${status}</strong> pada jadwal terbaru Anda. Akibatnya, Anda telah kehilangan seluruh Booking Credit (0/3 tersisa).</p><p style="color: red;"><strong>Akun Anda saat ini ditangguhkan.</strong> Silakan datang langsung ke barbershop untuk membuka kembali blokir akun Anda.</p>`
          : `<p>Halo <strong>${userName}</strong>,</p><p>Anda menerima penalti karena <strong>${status}</strong> pada jadwal terbaru Anda. Booking Credit Anda berkurang 1.</p><p>Sisa credit Anda saat ini: <strong style="font-size: 1.2em; color: #eab308;">${currentLife} / 3</strong>.</p>`;

        transporter.sendMail({
          from: `"BarberHub Admin" <${process.env.EMAIL_USER}>`,
          to: userEmail,
          subject: emailSubject,
          html: emailBody
        }).catch(err => console.error("Failed to send penalty email:", err));

        if (currentLife <= 0) {
          await connection.execute(
            "UPDATE users SET is_blocked = true, life_count = 0 WHERE id = ?",
            [customerId],
          );
          await connection.commit();
          return res.status(200).json({
            message: `Status successfully updated to ${status}. User has exceeded tolerance (0 Life), account automatically blocked.`,
          });
        }
      }

      await connection.commit();
      res.status(200).json({
        message: `Booking successfully updated to status: ${status}!`,
      });
    } catch (error) {
      await connection.rollback();
      console.error("Admin Status Update Error:", error);
      res.status(500).json({ message: "Failed to update booking status." });
    } finally {
      connection.release();
    }
  },
);

// 13. Admin: Delete Barber
app.delete(
  "/api/barbers/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const barberId = req.params.id;

      await db.execute("DELETE FROM barbers WHERE id = ?", [barberId]);

      res.status(200).json({
        message: "Barber successfully deleted along with all their schedules.",
      });
    } catch (error) {
      console.error("Delete Barber Error:", error);
      res.status(500).json({ message: "Failed to delete barber." });
    }
  },
);

// 14. Admin: Update/Edit Barber (FIXED UPLOAD URL)
app.put(
  "/api/barbers/:id",
  authenticateToken,
  requireAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const barberId = req.params.id;
      const { fullName, specialty, experienceYears, price } = req.body;

      if (req.file) {
        // Engine Fix: Membuat URL dinamis
        const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        
        await db.execute(
          "UPDATE barbers SET full_name = ?, specialty = ?, experience_years = ?, price = ?, photo_url = ? WHERE id = ?",
          [fullName, specialty, experienceYears, price, imageUrl, barberId],
        );
      } else {
        await db.execute(
          "UPDATE barbers SET full_name = ?, specialty = ?, experience_years = ?, price = ? WHERE id = ?",
          [fullName, specialty, experienceYears, price, barberId],
        );
      }

      res.status(200).json({ message: "Barber data successfully updated!" });
    } catch (error) {
      console.error("Update Barber Error:", error);
      res.status(500).json({ message: "Failed to update barber data." });
    }
  },
);

// 15. Admin: Mengambil Daftar Semua Pelanggan
app.get(
  "/api/admin/customers",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const [customers] = await db.execute(
        'SELECT id, full_name, whatsapp, email, life_count, is_blocked FROM users WHERE role = "Customer" ORDER BY full_name ASC',
      );
      res.status(200).json(customers);
    } catch (error) {
      console.error("Fetch Customers Error:", error);
      res.status(500).json({ message: "Failed to fetch customers." });
    }
  },
);

// 16. Admin: Reset Nyawa & Buka Blokir Pelanggan
app.put(
  "/api/admin/customers/:id/reset",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const customerId = req.params.id;

      await db.execute(
        "UPDATE users SET life_count = 3, is_blocked = FALSE WHERE id = ?",
        [customerId],
      );

      res
        .status(200)
        .json({ message: "Life count successfully reset and block removed!" });
    } catch (error) {
      console.error("Reset Customer Error:", error);
      res.status(500).json({ message: "Failed to reset customer." });
    }
  },
);

// 17. Customer: Update Data Profil
app.put("/api/users/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const { fullName, whatsapp } = req.body;

    if (req.user.id !== parseInt(userId)) {
      return res
        .status(403)
        .json({ message: "Access denied. This is not your account." });
    }

    await db.execute(
      "UPDATE users SET full_name = ?, whatsapp = ? WHERE id = ?",
      [fullName, whatsapp, userId],
    );

    res.status(200).json({ message: "Profile successfully updated!" });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

// --- AUTOMATED BACKGROUND RECONCILIATION ENGINE (CRON JOB) ---
cron.schedule(
  "59 23 * * *",
  async () => {
    console.log("Running End-of-Day Booking Audit Engine...");
    try {
      const todayStr = new Date().toISOString().split("T")[0];

      await db.execute(
        `
            UPDATE bookings 
            SET status = 'Requires Admin Review' 
            WHERE status = 'Upcoming' AND time_slot_id IN (
                SELECT id FROM time_slots WHERE slot_date = ?
            )
        `,
        [todayStr],
      );

      console.log(
        "Audit Completed. All pending bookings set to 'Requires Admin Review'.",
      );
    } catch (error) {
      console.error("Error running Cron Job Audit:", error);
    }
  },
  {
    scheduled: true,
    timezone: "Asia/Jakarta",
  },
);

// 18. Customer: Submit a Review
app.post("/api/reviews", authenticateToken, async (req, res) => {
  try {
    const { bookingId, rating, reviewText } = req.body;
    const customerId = req.user.id;

    if (!bookingId || !rating) {
      return res.status(400).json({ message: "Booking ID dan rating wajib diisi." });
    }

    const [bookings] = await db.execute(
      `SELECT b.id, ts.barber_id FROM bookings b 
       JOIN time_slots ts ON b.time_slot_id = ts.id
       WHERE b.id = ? AND b.customer_id = ? AND b.status = 'Completed'`,
      [bookingId, customerId]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ message: "Booking tidak ditemukan atau belum selesai." });
    }

    const barberId = bookings[0].barber_id;

    const [existing] = await db.execute(
      "SELECT id FROM reviews WHERE booking_id = ?",
      [bookingId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "You have already reviewed this booking." });
    }

    await db.execute(
      "INSERT INTO reviews (booking_id, customer_id, barber_id, rating, review_text) VALUES (?, ?, ?, ?, ?)",
      [bookingId, customerId, barberId, rating, reviewText || ""]
    );

    await db.execute(
      `UPDATE barbers SET overall_rating = (
         SELECT ROUND(AVG(rating), 1) FROM reviews WHERE barber_id = ?
       ) WHERE id = ?`,
      [barberId, barberId]
    );

    res.status(201).json({ message: "Review berhasil dikirim!" });

  } catch (error) {
    console.error("Review Error:", error);
    res.status(500).json({ message: "Gagal mengirim review." });
  }
});

// 19. Admin: Get Reviews for a Specific Barber
app.get("/api/barbers/:id/reviews", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const barberId = req.params.id;
    const [reviews] = await db.execute(
      `SELECT r.rating, r.review_text, r.created_at, u.full_name as customer_name 
       FROM reviews r 
       JOIN users u ON r.customer_id = u.id 
       WHERE r.barber_id = ? 
       ORDER BY r.created_at DESC`,
      [barberId]
    );
    res.status(200).json(reviews);
  } catch (error) {
    console.error("Fetch Reviews Error:", error);
    res.status(500).json({ message: "Failed to load reviews." });
  }
});

// 3.5. Forgot Password
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const [users] = await db.execute("SELECT id, full_name FROM users WHERE email = ?", [email]);
    
    if (users.length === 0) {
      return res.status(404).json({ message: "Jika email terdaftar, tautan reset akan dikirim." }); 
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expireTime = new Date(Date.now() + 15 * 60 * 1000); 

    await db.execute(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
      [resetToken, expireTime, users[0].id]
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `"BarberHub Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "BarberHub - Password Reset Request",
      html: `
        <h3>Halo, ${users[0].full_name}</h3>
        <p>Kami menerima permintaan untuk mereset password Anda.</p>
        <p>Klik tautan di bawah ini untuk mengatur password baru. Tautan ini hanya berlaku selama <strong>15 menit</strong>.</p>
        <a href="${resetLink}" style="padding: 10px 15px; background-color: #d4af37; color: #111827; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Reset Password</a>
        <p>Jika Anda tidak meminta ini, abaikan email ini.</p>
      `
    });

    res.status(200).json({ message: "Instruksi reset password telah dikirim ke email Anda." });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Gagal memproses permintaan." });
  }
});

// 3.6. Reset Password Confirmation
app.post("/api/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "Token tidak valid atau password kurang dari 8 karakter." });
    }

    const [users] = await db.execute(
      "SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: "Token reset password tidak valid atau sudah kedaluwarsa." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.execute(
      "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [hashedPassword, users[0].id]
    );

    res.status(200).json({ message: "Password berhasil diubah. Silakan login." });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Gagal mereset password." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
