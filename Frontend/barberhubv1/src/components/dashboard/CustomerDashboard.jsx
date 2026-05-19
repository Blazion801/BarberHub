import { useState, useEffect } from "react";
import {
  CalendarCheck,
  Clock,
  Scissors,
  LogOut,
  X,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  User,
  Save,
  Phone,
  Mail,
  ShieldCheck,
  Edit,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // --- GLOBAL STATES ---
  const [activeTab, setActiveTab] = useState("booking"); // booking, history, profile

  // --- BOOKING STATES ---
  const [currentLifeCount, setCurrentLifeCount] = useState(
    user?.life_count || 3,
  );
  const [barbers, setBarbers] = useState([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTimeForConfirm, setSelectedTimeForConfirm] = useState(null);

  // --- HISTORY STATES ---
  const [bookingHistory, setBookingHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState("Semua");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // --- CANCEL MODAL STATE ---
  const [cancelData, setCancelData] = useState({
    isOpen: false,
    bookingId: null,
    message: "",
    isPenalty: false,
  });

  // --- PROFILE STATES ---
  const [profileData, setProfileData] = useState({
    fullName: "",
    whatsapp: "",
    email: "",
    isBlocked: false,
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // --- FETCH INITIAL DATA ---
  useEffect(() => {
    fetchBarbers();
    if (user?.id) fetchUserProfile(); // Tarik profil langsung di awal
  }, []);

  useEffect(() => {
    if (activeTab === "history") fetchHistory();
    if (activeTab === "profile") fetchUserProfile();
  }, [activeTab]);

  const fetchBarbers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/barbers");
      setBarbers(response.data);
    } catch (error) {
      console.error("Error fetching barbers:", error);
    }
  };

  const fetchHistory = async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/api/bookings/customer/${user.id}`,
      );
      setBookingHistory(response.data);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Gagal memuat riwayat booking.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    try {
      const response = await axios.get(
        `http://localhost:5000/api/users/${user.id}`,
      );
      const data = response.data;
      setCurrentLifeCount(data.life_count);
      setProfileData({
        fullName: data.full_name,
        whatsapp: data.whatsapp,
        email: data.email,
        isBlocked: data.is_blocked,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  // Helper untuk mengambil 2 huruf pertama dari nama
  const getInitials = (name) => {
    if (!name) return "C";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // --- PROFILE LOGIC ---
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/users/${user.id}`,
        {
          fullName: profileData.fullName,
          whatsapp: profileData.whatsapp,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      toast.success("Profil berhasil diperbarui!");
      setIsEditingProfile(false);
      fetchUserProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal memperbarui profil.");
    }
  };

  // --- CALENDAR & BOOKING LOGIC ---
  const getNext7Days = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };
  const calendarDays = getNext7Days();
  const formatDateForAPI = (dateObj) => dateObj.toISOString().split("T")[0];

  const fetchAvailableSlots = async (barberId, dateString) => {
    setIsLoadingSlots(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/api/availability?barberId=${barberId}&date=${dateString}`,
      );
      setAvailableSlots(response.data);
    } catch (error) {
      console.error("Error slots:", error);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleOpenBooking = (barber) => {
    if (profileData.isBlocked) {
      return toast.error(
        "Akun Anda sedang diblokir karena poin penalti habis.",
      );
    }
    setSelectedBarber(barber);
    const today = formatDateForAPI(new Date());
    setSelectedDate(today);
    setSelectedTimeForConfirm(null);
    setIsBookingModalOpen(true);
    fetchAvailableSlots(barber.id, today);
  };

  const handleDateSelect = (dateObj) => {
    const dateString = formatDateForAPI(dateObj);
    setSelectedDate(dateString);
    setSelectedTimeForConfirm(null);
    fetchAvailableSlots(selectedBarber.id, dateString);
  };

  const handleTimeClick = (timeString) => setSelectedTimeForConfirm(timeString);

  const executeBooking = async () => {
    if (!user || !user.id) return toast.error("Sesi tidak valid.");
    setIsSubmitting(true);
    try {
      const payload = {
        customerId: user.id,
        barberId: selectedBarber.id,
        date: selectedDate,
        time: selectedTimeForConfirm,
      };
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:5000/api/bookings",
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.status === 201) {
        toast.success("Booking berhasil! Cek Riwayat Anda.");
        setIsBookingModalOpen(false);
        setActiveTab("history");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal melakukan booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- CANCELLATION LOGIC ---
  const handleCancelBooking = (bookingId, dateString, timeString) => {
    const aptDate = new Date(dateString);
    const formattedDate = aptDate.toISOString().split("T")[0];
    const appointmentDateTime = new Date(`${formattedDate}T${timeString}`);
    const now = new Date();

    const diffInHours = (appointmentDateTime - now) / (1000 * 60 * 60);

    let confirmMessage = "";
    let isPenalty = false;

    if (diffInHours < 3) {
      confirmMessage =
        "PERHATIAN: Anda membatalkan kurang dari 3 jam sebelum jadwal. Kesempatan Batal (Kredit Kursi) Anda akan berkurang 1. Yakin ingin melanjutkan?";
      isPenalty = true;
    } else {
      confirmMessage =
        "Aman: Anda membatalkan lebih dari 3 jam sebelum jadwal. Kredit Kursi Anda tidak akan berkurang. Yakin ingin melanjutkan?";
      isPenalty = false;
    }

    setCancelData({
      isOpen: true,
      bookingId: bookingId,
      message: confirmMessage,
      isPenalty: isPenalty,
    });
  };

  const executeCancellation = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        "http://localhost:5000/api/bookings/cancel",
        {
          bookingId: cancelData.bookingId,
          customerId: user.id,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.status === 200) {
        toast.success(response.data.message);
        fetchHistory();
        setCancelData({
          isOpen: false,
          bookingId: null,
          message: "",
          isPenalty: false,
        });
        fetchUserProfile(); // Update life count immediately
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Gagal membatalkan booking.",
      );
    }
  };

  // --- HELPERS FOR UI ---
  const getDayName = (dateObj) =>
    dateObj.toLocaleDateString("id-ID", { weekday: "short" });
  const getDayNumber = (dateObj) => dateObj.getDate();
  const formatHistoryDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date
      .toLocaleDateString("id-ID", { month: "short" })
      .toUpperCase();
    return { day, month };
  };

  const filteredHistory = bookingHistory.filter((booking) => {
    if (historyFilter === "Semua") return true;
    if (historyFilter === "Selesai" && booking.status === "Completed")
      return true;
    if (
      historyFilter === "Penalti" &&
      (booking.status === "Cancelled" || booking.status === "No-Show")
    )
      return true;
    return false;
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-barber-bg font-sans text-barber-text pb-20 relative">
      <nav className="bg-barber-surface border-b border-barber-muted/20 px-6 py-4 sticky top-0 z-40 flex justify-between items-center shadow-lg">
        <h1 className="text-2xl font-bold text-barber-accent font-serif italic tracking-wide">
          BarberHub
        </h1>
        <button
          onClick={handleLogout}
          className="text-barber-muted hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <span className="hidden sm:inline">Keluar</span>
          <LogOut size={18} />
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {/* Header & Stats */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-bold font-serif text-barber-text mb-2">
              Selamat datang,{" "}
              <span className="text-barber-accent">
                {profileData.fullName || user?.name || "Customer"}
              </span>
              .
            </h2>
            <p className="text-barber-text/70">
              Siap untuk menyegarkan gaya Anda hari ini?
            </p>
          </div>
          <div className="bg-barber-surface border border-barber-muted/20 rounded-xl p-4 flex items-center gap-4">
            <div
              className={`${profileData.isBlocked ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"} p-3 rounded-full`}
            >
              <CalendarCheck size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-barber-muted uppercase tracking-wider">
                Status Akun
              </p>
              <p
                className={`text-lg font-bold ${profileData.isBlocked ? "text-red-500" : "text-barber-text"}`}
              >
                {profileData.isBlocked
                  ? "TERBLOKIR (0 Kesempatan)"
                  : `${currentLifeCount} Kesempatan Batal`}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher - NOW 3 COLUMNS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <button
            onClick={() => setActiveTab("booking")}
            className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
              activeTab === "booking"
                ? "bg-barber-accent text-barber-bg shadow-lg shadow-barber-accent/20 font-bold"
                : "bg-barber-surface border border-barber-muted/20 text-barber-text hover:bg-barber-muted/10 font-semibold"
            }`}
          >
            <CalendarCheck
              size={32}
              className={activeTab === "booking" ? "" : "text-barber-muted"}
            />
            <span className="text-lg">Booking Baru</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
              activeTab === "history"
                ? "bg-barber-accent text-barber-bg shadow-lg shadow-barber-accent/20 font-bold"
                : "bg-barber-surface border border-barber-muted/20 text-barber-text hover:bg-barber-muted/10 font-semibold"
            }`}
          >
            <Clock
              size={32}
              className={activeTab === "history" ? "" : "text-barber-muted"}
            />
            <span className="text-lg">Riwayat & Penalti</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
              activeTab === "profile"
                ? "bg-barber-accent text-barber-bg shadow-lg shadow-barber-accent/20 font-bold"
                : "bg-barber-surface border border-barber-muted/20 text-barber-text hover:bg-barber-muted/10 font-semibold"
            }`}
          >
            <User
              size={32}
              className={activeTab === "profile" ? "" : "text-barber-muted"}
            />
            <span className="text-lg">Profil Saya</span>
          </button>
        </div>

        {/* TAB 1: BOOKING */}
        {activeTab === "booking" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-2xl font-bold font-serif text-barber-text mb-6">
              Pilih Barber Anda
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {barbers.map((barber) => {
                // Membelah specialty dari backend yang gabungan
                const rawSpecialty = barber.specialty
                  ? barber.specialty.split("•")[0].trim()
                  : barber.specialty;

                return (
                  <div
                    key={barber.id}
                    className="bg-barber-surface rounded-2xl overflow-hidden border border-barber-muted/20 flex flex-col sm:flex-row shadow-lg"
                  >
                    <img
                      src={barber.image}
                      alt={barber.name}
                      className="w-full sm:w-48 h-48 object-cover"
                    />
                    <div className="p-6 flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-xl font-bold text-barber-text">
                            {barber.name}
                          </h4>
                          <span className="bg-barber-bg px-2 py-1 rounded text-sm font-bold text-barber-accent flex items-center gap-1">
                            ★ {barber.rating}
                          </span>
                        </div>
                        <p className="text-sm text-barber-text/70 mb-4">
                          {rawSpecialty}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenBooking(barber)}
                        className="w-full border border-barber-accent text-barber-accent py-2.5 rounded-lg font-semibold hover:bg-barber-accent hover:text-barber-bg transition-colors"
                      >
                        Booking Jadwal
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === "history" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <h3 className="text-2xl font-bold text-barber-text">
                Riwayat Reservasi
              </h3>
            </div>

            <div className="flex gap-6 border-b border-barber-muted/20 mb-6 pb-2">
              {["Semua", "Selesai", "Penalti"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setHistoryFilter(tab)}
                  className={`text-sm font-bold pb-2 transition-colors relative ${historyFilter === tab ? "text-barber-accent" : "text-barber-muted hover:text-barber-text"}`}
                >
                  {tab}
                  {historyFilter === tab && (
                    <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-barber-accent rounded-t-full"></div>
                  )}
                </button>
              ))}
            </div>

            {isLoadingHistory ? (
              <div className="text-center py-10 text-barber-muted animate-pulse">
                Memuat riwayat...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-10 text-barber-muted bg-barber-surface rounded-xl border border-barber-muted/10">
                Belum ada data di kategori ini.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((booking) => {
                  const { day, month } = formatHistoryDate(
                    booking.booking_date,
                  );
                  return (
                    <div
                      key={booking.id}
                      className="bg-barber-surface border border-barber-muted/20 rounded-xl p-5 shadow-sm"
                    >
                      <div className="flex items-center gap-5">
                        <div className="bg-barber-bg border border-barber-muted/30 rounded-lg w-16 h-16 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-xl font-bold text-barber-text leading-none">
                            {day}
                          </span>
                          <span className="text-xs font-semibold text-barber-muted">
                            {month}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-barber-text">
                            {booking.barber_name}
                          </h4>
                          <div className="flex items-center text-sm text-barber-muted gap-1 mt-1">
                            <Clock size={14} />{" "}
                            {booking.start_time.substring(0, 5)} WIB
                          </div>
                        </div>
                        <div>
                          {booking.status === "Upcoming" && (
                            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded">
                              MENDATANG
                            </span>
                          )}
                          {booking.status === "Completed" && (
                            <span className="text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded">
                              SELESAI
                            </span>
                          )}
                          {booking.status === "Cancelled" && (
                            <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded border border-red-500/20">
                              DIBATALKAN
                            </span>
                          )}
                          {booking.status === "No-Show" && (
                            <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded border border-red-500/20">
                              TIDAK HADIR
                            </span>
                          )}
                        </div>
                      </div>

                      {booking.status === "Upcoming" && (
                        <div className="mt-4 pt-4 border-t border-barber-muted/10 flex justify-end">
                          <button
                            onClick={() =>
                              handleCancelBooking(
                                booking.id,
                                booking.booking_date,
                                booking.start_time,
                              )
                            }
                            className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors"
                          >
                            Batalkan Booking
                          </button>
                        </div>
                      )}

                      {booking.status === "Cancelled" && (
                        <div className="mt-4 bg-red-950/30 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                          <AlertTriangle
                            size={16}
                            className="text-red-400 mt-0.5 flex-shrink-0"
                          />
                          <p className="text-xs text-red-400 font-medium leading-relaxed">
                            Penalti: Pembatalan Booking (Kredit Kursi -1)
                          </p>
                        </div>
                      )}

                      {booking.status === "No-Show" && (
                        <div className="mt-4 bg-red-950/30 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                          <AlertTriangle
                            size={16}
                            className="text-red-400 mt-0.5 flex-shrink-0"
                          />
                          <p className="text-xs text-red-400 font-medium leading-relaxed">
                            Penalti: Tidak hadir pada jadwal (Kredit Kursi -1)
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PROFILE VIP DESIGN */}
        {activeTab === "profile" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto">
            <div className="bg-barber-surface border border-barber-muted/20 rounded-3xl overflow-hidden shadow-2xl relative">
              {/* Header Background (Aesthetic Cover) */}
              <div className="h-32 bg-gradient-to-r from-barber-bg via-barber-surface to-barber-accent/20 border-b border-barber-muted/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-barber-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              </div>

              <div className="px-8 pb-8 relative">
                {/* Avatar & Action Button */}
                <div className="flex justify-between items-end -mt-12 mb-8">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-barber-accent to-yellow-600 p-1 shadow-xl">
                    <div className="w-full h-full bg-barber-surface rounded-xl flex items-center justify-center text-3xl font-bold font-serif text-barber-text">
                      {getInitials(profileData.fullName || user?.name)}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="bg-barber-bg border border-barber-muted/30 hover:border-barber-accent text-barber-text px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
                  >
                    {isEditingProfile ? (
                      <>
                        <X size={16} className="text-red-400" /> Batal
                      </>
                    ) : (
                      <>
                        <Edit size={16} className="text-barber-accent" /> Edit
                        Profil
                      </>
                    )}
                  </button>
                </div>

                {isEditingProfile ? (
                  /* EDIT FORM MODE */
                  <form
                    onSubmit={handleProfileUpdate}
                    className="space-y-5 animate-in fade-in duration-300 bg-barber-bg/50 p-6 rounded-2xl border border-barber-muted/10"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-barber-muted uppercase mb-2 tracking-wider ml-1">
                          Nama Lengkap
                        </label>
                        <div className="relative">
                          <User
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-barber-muted"
                          />
                          <input
                            type="text"
                            value={profileData.fullName}
                            onChange={(e) =>
                              setProfileData({
                                ...profileData,
                                fullName: e.target.value,
                              })
                            }
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-barber-surface border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none font-semibold transition-colors"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-barber-muted uppercase mb-2 tracking-wider ml-1">
                          Nomor WhatsApp
                        </label>
                        <div className="relative">
                          <Phone
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-barber-muted"
                          />
                          <input
                            type="text"
                            value={profileData.whatsapp}
                            onChange={(e) =>
                              setProfileData({
                                ...profileData,
                                whatsapp: e.target.value,
                              })
                            }
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-barber-surface border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none font-semibold transition-colors"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-barber-muted/50 uppercase mb-2 tracking-wider ml-1">
                        Email (Akun Permanen)
                      </label>
                      <div className="relative">
                        <Mail
                          size={18}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-barber-muted/50"
                        />
                        <input
                          type="email"
                          value={profileData.email}
                          disabled
                          className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-barber-bg border border-barber-muted/10 text-barber-muted cursor-not-allowed font-semibold opacity-70"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-barber-accent text-barber-bg py-4 rounded-xl font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 mt-6 shadow-lg shadow-barber-accent/20"
                    >
                      <Save size={20} /> Simpan Perubahan Profil
                    </button>
                  </form>
                ) : (
                  /* VIEW MODE */
                  <div className="animate-in fade-in duration-300 space-y-8">
                    {/* User Identity */}
                    <div>
                      <h3 className="text-3xl font-bold font-serif text-barber-text">
                        {profileData.fullName}
                      </h3>
                      <p className="text-barber-accent font-semibold text-sm flex items-center gap-1.5 mt-1">
                        <ShieldCheck size={16} /> Customer Terverifikasi
                      </p>
                    </div>

                    {/* Contact Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-barber-bg border border-barber-muted/10 rounded-2xl p-5 flex items-center gap-5 hover:border-barber-muted/30 transition-colors">
                        <div className="bg-barber-surface p-3.5 rounded-xl text-barber-muted shadow-sm">
                          <Phone size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-barber-muted uppercase tracking-wider mb-0.5">
                            Nomor WhatsApp
                          </p>
                          <p className="text-lg font-semibold text-barber-text">
                            {profileData.whatsapp}
                          </p>
                        </div>
                      </div>
                      <div className="bg-barber-bg border border-barber-muted/10 rounded-2xl p-5 flex items-center gap-5 hover:border-barber-muted/30 transition-colors">
                        <div className="bg-barber-surface p-3.5 rounded-xl text-barber-muted shadow-sm">
                          <Mail size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-barber-muted uppercase tracking-wider mb-0.5">
                            Alamat Email
                          </p>
                          <p
                            className="text-lg font-semibold text-barber-text truncate max-w-[200px]"
                            title={profileData.email}
                          >
                            {profileData.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Life/Status VIP Card */}
                    <div
                      className={`border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden ${profileData.isBlocked ? "bg-red-950/20 border-red-500/30" : "bg-gradient-to-r from-barber-bg to-barber-surface border-barber-muted/20"}`}
                    >
                      {/* Decorative Background Icon */}
                      <AlertTriangle
                        size={120}
                        className={`absolute -right-10 -bottom-10 opacity-5 ${profileData.isBlocked ? "text-red-500" : "text-barber-accent"}`}
                      />

                      <div className="flex items-center gap-5 z-10">
                        <div
                          className={`p-4 rounded-full border ${profileData.isBlocked ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-barber-surface border-barber-muted/20 text-barber-accent"}`}
                        >
                          <AlertTriangle size={28} />
                        </div>
                        <div>
                          <h4 className="font-bold text-barber-text text-lg mb-1">
                            Status Keanggotaan
                          </h4>
                          <p className="text-sm text-barber-muted font-medium">
                            {profileData.isBlocked
                              ? "Akun Anda dibekukan sementara. Silakan hubungi Admin."
                              : "Jaga kredit Anda agar tetap bisa melakukan reservasi."}
                          </p>
                        </div>
                      </div>

                      <div className="z-10 flex flex-col items-center md:items-end w-full md:w-auto bg-barber-surface/50 p-4 rounded-xl border border-barber-muted/10">
                        <span className="text-xs font-bold text-barber-muted uppercase tracking-wider mb-2">
                          Sisa Kredit Kursi
                        </span>
                        <div className="flex gap-2">
                          {[1, 2, 3].map((life) => (
                            <div
                              key={life}
                              className={`w-10 h-2.5 rounded-full transition-all duration-500 ${life <= currentLifeCount ? "bg-barber-accent shadow-[0_0_12px_rgba(212,175,55,0.4)]" : "bg-barber-bg border border-barber-muted/20"}`}
                            ></div>
                          ))}
                        </div>
                        <span
                          className={`text-sm font-bold mt-2 ${profileData.isBlocked ? "text-red-500" : "text-barber-text"}`}
                        >
                          {currentLifeCount} / 3 Tersisa
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL 1: BOOKING CREATION --- */}
      {isBookingModalOpen && selectedBarber && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
          <div className="bg-barber-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            <div className="p-6 border-b border-barber-muted/20 flex justify-between items-start relative">
              <div className="flex gap-4 items-center">
                <img
                  src={selectedBarber.image}
                  alt={selectedBarber.name}
                  className="w-12 h-12 rounded-full object-cover border border-barber-accent"
                />
                <div>
                  <h3 className="text-xl font-bold font-serif text-barber-text">
                    {selectedBarber.name}
                  </h3>
                  <p className="text-sm text-barber-accent font-semibold">
                    {selectedBarber.specialty
                      ? selectedBarber.specialty.split("•")[0].trim()
                      : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="text-barber-muted hover:text-red-400 p-1 bg-barber-bg rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {!selectedTimeForConfirm ? (
                <>
                  <div className="mb-8">
                    <h4 className="text-sm font-bold text-barber-text uppercase tracking-wider mb-4">
                      Pilih Tanggal
                    </h4>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {calendarDays.map((dateObj, idx) => {
                        const dateStr = formatDateForAPI(dateObj);
                        const isSelected = selectedDate === dateStr;
                        return (
                          <button
                            key={idx}
                            onClick={() => handleDateSelect(dateObj)}
                            className={`flex flex-col items-center min-w-[4.5rem] py-3 rounded-xl border snap-start transition-all ${isSelected ? "bg-barber-accent border-barber-accent text-barber-bg shadow-md scale-105" : "bg-barber-bg border-barber-muted/20 text-barber-text hover:border-barber-accent/50"}`}
                          >
                            <span
                              className={`text-xs font-semibold mb-1 ${isSelected ? "text-barber-bg/80" : "text-barber-muted"}`}
                            >
                              {idx === 0 ? "Hari Ini" : getDayName(dateObj)}
                            </span>
                            <span className="text-xl font-bold">
                              {getDayNumber(dateObj)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-barber-text uppercase tracking-wider mb-4">
                    Slot Tersedia
                  </h4>
                  {isLoadingSlots ? (
                    <div className="py-8 text-center text-barber-accent animate-pulse font-semibold">
                      Mencari jadwal kosong...
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="py-8 text-center text-red-400 font-semibold bg-red-500/10 rounded-xl border border-red-500/20">
                      Maaf, jadwal penuh pada tanggal ini.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {availableSlots.map((timeStr) => (
                        <button
                          key={timeStr}
                          onClick={() => handleTimeClick(timeStr)}
                          className="py-3 px-2 text-center rounded-xl font-bold border border-barber-muted/30 bg-barber-bg text-barber-text hover:border-barber-accent hover:text-barber-accent transition-all active:scale-95"
                        >
                          {timeStr.substring(0, 5)}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="animate-in fade-in zoom-in duration-200">
                  <div className="bg-barber-bg rounded-xl border border-barber-muted/20 p-6 mb-6">
                    <h4 className="text-center font-bold text-barber-text mb-4 uppercase tracking-wider text-sm border-b border-barber-muted/20 pb-4">
                      Ringkasan Booking
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-barber-muted text-sm">
                          Barber
                        </span>
                        <span className="font-bold text-barber-text">
                          {selectedBarber.name}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-barber-muted text-sm">
                          Tanggal
                        </span>
                        <span className="font-bold text-barber-text">
                          {new Date(selectedDate).toLocaleDateString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-barber-muted text-sm">Jam</span>
                        <span className="font-bold text-barber-text text-lg text-barber-accent">
                          {selectedTimeForConfirm.substring(0, 5)} WIB
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedTimeForConfirm(null)}
                      disabled={isSubmitting}
                      className="flex-1 py-3.5 rounded-xl font-semibold text-barber-text bg-barber-bg border border-barber-muted/30 hover:bg-barber-surface transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={18} /> Kembali
                    </button>
                    <button
                      onClick={executeBooking}
                      disabled={isSubmitting}
                      className="flex-[2] py-3.5 rounded-xl font-bold text-barber-bg bg-barber-accent hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        "Memproses..."
                      ) : (
                        <>
                          <CheckCircle2 size={18} /> Konfirmasi
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CUSTOM CANCELLATION WARNING --- */}
      {cancelData.isOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-barber-surface border border-barber-muted/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {cancelData.isPenalty ? (
                  <div className="bg-red-500/10 p-3 rounded-full text-red-500">
                    <AlertTriangle size={24} />
                  </div>
                ) : (
                  <div className="bg-blue-500/10 p-3 rounded-full text-blue-400">
                    <CheckCircle2 size={24} />
                  </div>
                )}
                <h3 className="text-xl font-bold font-serif text-barber-text">
                  {cancelData.isPenalty
                    ? "Konfirmasi Penalti"
                    : "Konfirmasi Pembatalan"}
                </h3>
              </div>

              <p className="text-barber-text/80 text-sm leading-relaxed mb-8">
                {cancelData.message}
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() =>
                    setCancelData({ ...cancelData, isOpen: false })
                  }
                  className="px-5 py-2.5 rounded-xl font-semibold text-barber-text hover:bg-barber-muted/10 transition-colors"
                >
                  Kembali
                </button>
                <button
                  onClick={executeCancellation}
                  className={`px-5 py-2.5 rounded-xl font-bold text-barber-bg transition-all active:scale-95 ${
                    cancelData.isPenalty
                      ? "bg-red-500 hover:bg-red-400"
                      : "bg-barber-accent hover:bg-opacity-90"
                  }`}
                >
                  Ya, Batalkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
