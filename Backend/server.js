const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cron = require("node-cron"); // Pembetulan Eror 1: Require node-cron dipastikan ada!

const db = require("./config/db");

const app = express();
app.use(cors());
app.use(express.json());

// --- UPLOAD ENGINE SETUP ---
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
      .json({ message: "Akses ditolak. Token tidak ditemukan." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ message: "Token tidak valid atau sudah kedaluwarsa." });
    }
    req.user = user; // Menyimpan data payload JWT (id, role, name) ke dalam request
    next();
  });
};

// Middleware Khusus Admin (Role-Based Access Control / RBAC)
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res
      .status(403)
      .json({ message: "Akses ditolak. Hanya untuk Role Admin." });
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
      return res.status(400).json({ message: "Semua data wajib diisi." });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password minimal harus 8 karakter." });
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
        message: "Email sudah terdaftar. Silakan gunakan email lain.",
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
        .json({ message: "Email dan password wajib diisi." });
    }

    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "Akun tidak ditemukan. Silakan daftar." });
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
    res.status(500).json({ message: "Server error saat login." });
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
    res.status(500).json({ message: "Gagal mengambil data barber." });
  }
});

// 5. Create Barber
app.post("/api/barbers", upload.single("image"), async (req, res) => {
  try {
    const { fullName, specialty, experienceYears, price } = req.body;
    if (!req.file)
      return res.status(400).json({ message: "Foto wajib diupload." });
    const photoUrl = `http://localhost:5000/uploads/${req.file.filename}`;

    await db.execute(
      "INSERT INTO barbers (full_name, specialty, experience_years, price, photo_url, status, overall_rating) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [fullName, specialty, experienceYears, price, photoUrl, "Active", 5.0],
    );
    res.status(201).json({ message: "Barber berhasil ditambahkan!" });
  } catch (error) {
    res.status(500).json({ message: "Gagal menambahkan barber." });
  }
});

// 6. Availability Engine (Lazy Loading & TIME TRAVEL FIX)
app.get("/api/availability", async (req, res) => {
  try {
    const { barberId, date } = req.query;
    if (!barberId || !date)
      return res
        .status(400)
        .json({ message: "Barber ID dan Tanggal wajib diisi." });

    const [existingSlots] = await db.execute(
      "SELECT start_time, status FROM time_slots WHERE barber_id = ? AND slot_date = ?",
      [barberId, date],
    );

    // Jika belum ada jadwal di database untuk tanggal ini, buatkan otomatis (09:00 - 19:00)
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
    
    // --- THE TIME TRAVEL FIX ---
    const availableTimes = finalSlots
      .filter((slot) => {
        // 1. Pastikan statusnya memang Available
        if (slot.status !== "Available") return false;
        
        // 2. Cegah booking slot yang sudah lewat waktu (Masa Lalu)
        const slotDateTime = new Date(`${date}T${slot.start_time}`);
        const now = new Date();
        
        // Hanya kembalikan true jika waktu slot lebih besar dari waktu saat ini
        return slotDateTime > now; 
      })
      .map((slot) => slot.start_time);
      
    res.status(200).json(availableTimes);
  } catch (error) {
    console.error("Availability Error:", error);
    res.status(500).json({ message: "Gagal memuat jadwal." });
  }
});

// 7. Create a New Booking (With Concurrency Lock & Life Count Validation)
app.post("/api/bookings", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { customerId, barberId, date, time } = req.body;

    if (!customerId || !barberId || !date || !time) {
      return res.status(400).json({ message: "Data booking tidak lengkap." });
    }

    await connection.beginTransaction();

    const [users] = await connection.execute(
      "SELECT life_count, is_blocked FROM users WHERE id = ?",
      [customerId],
    );
    if (users.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: "Data pengguna tidak ditemukan." });
    }

    const user = users[0];
    if (user.is_blocked === 1 || user.life_count <= 0) {
      await connection.rollback();
      return res.status(403).json({
        message:
          "Pemesanan ditolak. Akun Anda ditangguhkan karena kredit kursi habis (0 Nyawa).",
      });
    }

    const [slots] = await connection.execute(
      "SELECT id, status FROM time_slots WHERE barber_id = ? AND slot_date = ? AND start_time = ? FOR UPDATE",
      [barberId, date, time],
    );

    if (slots.length === 0) {
      await connection.rollback();
      return res
        .status(404)
        .json({ message: "Slot waktu tidak tersedia pada sistem." });
    }

    const slot = slots[0];
    if (slot.status !== "Available") {
      await connection.rollback();
      return res.status(409).json({
        message: "Maaf, slot waktu ini baru saja dipesan oleh pengguna lain.",
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
  } catch (error) {
    await connection.rollback();
    console.error("Booking Concurrency Error:", error);
    res.status(500).json({
      message: "Gagal melakukan booking akibat gangguan konkurensi jaringan.",
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
                bar.photo_url AS barber_image
            FROM bookings b
            JOIN time_slots ts ON b.time_slot_id = ts.id
            JOIN barbers bar ON ts.barber_id = bar.id   
            WHERE b.customer_id = ?
            ORDER BY ts.slot_date DESC, ts.start_time DESC
        `,
      [customerId],
    );
    res.status(200).json(history);
  } catch (error) {
    res.status(500).json({ message: "Gagal memuat riwayat booking." });
  }
});

// 9. Cancel a Booking (Handles status updates, 3-Hour Penalty, & Auto-Block)
app.put("/api/bookings/cancel", authenticateToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { bookingId, customerId } = req.body;
    if (!bookingId || !customerId)
      return res
        .status(400)
        .json({ message: "Booking ID dan Customer ID wajib diisi." });

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
        message: "Booking tidak ditemukan atau tidak dapat dibatalkan.",
      });
    }

    const timeSlotId = bookings[0].time_slot_id;

    // FIX: Safely reconstruct the local date to prevent UTC timezone shifting bugs
    const rawDate = bookings[0].slot_date;
    const dateObj = new Date(rawDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    // Construct local appointment time
    const appointmentTime = new Date(`${year}-${month}-${day}T${bookings[0].start_time}`);
    const now = new Date();
    
    // Calculate difference
    const diffInHours = (appointmentTime - now) / (1000 * 60 * 60);

    await connection.execute(
      'UPDATE bookings SET status = "Cancelled" WHERE id = ?',
      [bookingId]
    );
    await connection.execute(
      'UPDATE time_slots SET status = "Available" WHERE id = ?',
      [timeSlotId]
    );

    // CHANGED TO 1 HOUR PENALTY RULE based on new requirements
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
            "Booking dibatalkan. Penalti: Waktu < 3 Jam, Kredit Kursi 0/3. Akun Anda otomatis ditangguhkan.",
        });
      }

      await connection.commit();
      return res.status(200).json({
        message:
          "Booking dibatalkan. (Penalti: Waktu Pembatalan < 3 Jam, Kredit Kursi -1)",
      });
    }

    await connection.commit();
    res
      .status(200)
      .json({ message: "Booking berhasil dibatalkan tanpa penalti (Aman)." });
  } catch (error) {
    await connection.rollback();
    console.error("Cancel Error:", error);
    res.status(500).json({ message: "Gagal membatalkan booking." });
  } finally {
    connection.release();
  }
});

// 10. Get Fresh User Data
// Mengambil detail satu user (Pelanggan)
app.get("/api/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    // FIX: Tambahkan full_name, whatsapp, dan email agar bisa ditarik oleh halaman Profil!
    const [users] = await db.execute(
      "SELECT id, full_name, whatsapp, email, life_count, is_blocked FROM users WHERE id = ?",
      [userId],
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    res.status(200).json(users[0]);
  } catch (error) {
    console.error("Get User Error:", error);
    res.status(500).json({ message: "Gagal mengambil data user." });
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
    res.status(500).json({ message: "Gagal memuat jadwal harian." });
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
        return res
          .status(400)
          .json({ message: "Data update status tidak lengkap." });
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
          "SELECT life_count FROM users WHERE id = ?",
          [customerId],
        );
        const currentLife = users[0].life_count;

        if (currentLife <= 0) {
          await connection.execute(
            "UPDATE users SET is_blocked = true, life_count = 0 WHERE id = ?",
            [customerId],
          );
          await connection.commit();
          return res.status(200).json({
            message: `Status diperbarui menjadi ${status}. Pengguna melanggar batas toleransi (0 Nyawa), akun otomatis diblokir.`,
          });
        }
      }

      await connection.commit();
      res.status(200).json({
        message: `Booking berhasil diperbarui menjadi status: ${status}!`,
      });
    } catch (error) {
      await connection.rollback();
      console.error("Admin Status Update Error:", error);
      res.status(500).json({ message: "Gagal mengubah status booking." });
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

      // Menghapus barber dari database.
      // Berkat fitur 'ON DELETE CASCADE' di SQL kalian,
      // semua time_slots dan bookings milik barber ini akan otomatis ikut terhapus bersih!
      await db.execute("DELETE FROM barbers WHERE id = ?", [barberId]);

      res.status(200).json({
        message: "Barber berhasil dihapus beserta seluruh jadwalnya.",
      });
    } catch (error) {
      console.error("Delete Barber Error:", error);
      res.status(500).json({ message: "Gagal menghapus barber." });
    }
  },
);

// 14. Admin: Update/Edit Barber
app.put(
  "/api/barbers/:id",
  authenticateToken,
  requireAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const barberId = req.params.id;
      const { fullName, specialty, experienceYears, price } = req.body;

      // Cek apakah admin mengupload foto baru atau pakai foto lama
      if (req.file) {
        const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
        await db.execute(
          "UPDATE barbers SET full_name = ?, specialty = ?, experience_years = ?, price = ?, photo_url = ? WHERE id = ?",
          [fullName, specialty, experienceYears, price, imageUrl, barberId],
        );
      } else {
        // Kalau foto nggak diganti, update teksnya aja
        await db.execute(
          "UPDATE barbers SET full_name = ?, specialty = ?, experience_years = ?, price = ? WHERE id = ?",
          [fullName, specialty, experienceYears, price, barberId],
        );
      }

      res.status(200).json({ message: "Data kapster berhasil diubah!" });
    } catch (error) {
      console.error("Update Barber Error:", error);
      res.status(500).json({ message: "Gagal mengubah data barber." });
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
      res.status(500).json({ message: "Gagal mengambil data pelanggan." });
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

      // Kembalikan nyawa jadi 3 dan pastikan status blokir dicabut
      await db.execute(
        "UPDATE users SET life_count = 3, is_blocked = FALSE WHERE id = ?",
        [customerId],
      );

      res
        .status(200)
        .json({ message: "Nyawa berhasil di-reset dan blokir dibuka!" });
    } catch (error) {
      console.error("Reset Customer Error:", error);
      res.status(500).json({ message: "Gagal mereset pelanggan." });
    }
  },
);
// 17. Customer: Update Data Profil
app.put("/api/users/:id", authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const { fullName, whatsapp } = req.body;

    // Keamanan berlapis: Pastikan yang ngedit beneran yang punya akun
    if (req.user.id !== parseInt(userId)) {
      return res
        .status(403)
        .json({ message: "Akses ditolak. Ini bukan akun Anda." });
    }

    await db.execute(
      "UPDATE users SET full_name = ?, whatsapp = ? WHERE id = ?",
      [fullName, whatsapp, userId],
    );

    res.status(200).json({ message: "Profil berhasil diperbarui!" });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Gagal memperbarui profil." });
  }
});

// --- AUTOMATED BACKGROUND RECONCILIATION ENGINE (CRON JOB) ---
cron.schedule(
  "59 23 * * *",
  async () => {
    console.log("Running End-of-Day Booking Audit Engine...");
    try {
      const todayStr = new Date().toISOString().split("T")[0];

      // Pembetulan Eror 3: Perbaikan query update join yang aman untuk seluruh versi MySQL engine
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
        "Audit Selesai. Seluruh booking menggantung dialihkan ke status 'Requires Admin Review'.",
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
