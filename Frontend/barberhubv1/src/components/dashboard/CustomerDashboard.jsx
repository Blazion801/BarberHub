import { useState, useEffect, useMemo } from "react";
import {
  CalendarCheck,
  Clock,
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
  Star,
  MessageCircle,
  QrCode
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import waQrCode from "../../assets/wa-qr.jpg"; // <-- ADD THIS IMPORT

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // --- APP NAVIGATION STATES ---
  const [activeTab, setActiveTab] = useState("home"); // home, history, profile, contact

  // --- GLOBAL DATA STATES ---
  const [currentLifeCount, setCurrentLifeCount] = useState(user?.life_count || 3);
  const [profileData, setProfileData] = useState({ fullName: "", whatsapp: "", email: "", isBlocked: false });
  const [bookingHistory, setBookingHistory] = useState([]);
  const [barbers, setBarbers] = useState([]);

  // --- BOOKING MODAL STATES ---
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedTimeForConfirm, setSelectedTimeForConfirm] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- HISTORY & UI STATES ---
  const [historyFilter, setHistoryFilter] = useState("All");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // --- ACTION MODALS ---
  const [cancelData, setCancelData] = useState({ isOpen: false, bookingId: null, message: "", isPenalty: false });
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // --- FETCH INITIAL DATA ---
  useEffect(() => {
    fetchBarbers();
    if (user?.id) fetchUserProfile();
  }, [user]);

  useEffect(() => {
    if (activeTab === "history" || activeTab === "home") fetchHistory();
    if (activeTab === "profile") fetchUserProfile();
  }, [activeTab, user]);

  const fetchBarbers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/barbers");
      setBarbers(response.data || []);
    } catch (error) { console.error("Error fetching barbers:", error); }
  };

  const fetchHistory = async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/bookings/customer/${user.id}`);
      setBookingHistory(response.data || []); 
    } catch (error) { toast.error("Failed to load booking history."); }
    finally { setIsLoadingHistory(false); }
  };

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    try {
      const response = await axios.get(`http://localhost:5000/api/users/${user.id}`);
      const data = response.data || {};
      setCurrentLifeCount(data.life_count ?? 3);
      setProfileData({
        fullName: data.full_name || "",
        whatsapp: data.whatsapp || "",
        email: data.email || "",
        isBlocked: data.is_blocked || false,
      });
    } catch (error) { console.error("Error fetching profile:", error); }
  };

  const getInitials = (name) => {
    if (!name) return "C";
    return String(name).split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const upcomingAppointment = useMemo(() => {
    if (!Array.isArray(bookingHistory)) return null; 
    const upcoming = bookingHistory.filter(b => b?.status === "Upcoming");
    if (upcoming.length === 0) return null;
    return upcoming[upcoming.length - 1]; 
  }, [bookingHistory]);

  const displayName = (profileData?.fullName || user?.name || "Customer").split(' ')[0];

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/users/${user.id}`,
        { fullName: profileData.fullName, whatsapp: profileData.whatsapp },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Profile updated successfully!");
      setIsEditingProfile(false);
      fetchUserProfile();
    } catch (error) { toast.error("Failed to update profile."); }
  };

  const getNext7Days = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() + i); dates.push(d); }
    return dates;
  };
  const calendarDays = getNext7Days();

  const formatDateForAPI = (dateObj) => {
    if (!dateObj) return "";
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchAvailableSlots = async (barberId, dateString) => {
    setIsLoadingSlots(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/availability?barberId=${barberId}&date=${dateString}`);
      setAvailableSlots(response.data || []);
    } catch (error) { console.error("Error slots:", error); }
    finally { setIsLoadingSlots(false); }
  };

  const handleOpenBooking = (barber) => {
    if (profileData.isBlocked) return toast.error("Your account is blocked. Please visit the shop directly.");
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
    fetchAvailableSlots(selectedBarber?.id, dateString);
  };

  const executeBooking = async () => {
    if (!user || !user.id) return toast.error("Invalid session.");
    setIsSubmitting(true);
    try {
      const payload = { customerId: user.id, barberId: selectedBarber.id, date: selectedDate, time: selectedTimeForConfirm };
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:5000/api/bookings", payload, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success("Booking confirmed!");
      setIsBookingModalOpen(false);
      fetchHistory(); 
    } catch (error) { toast.error(error.response?.data?.message || "Failed to book appointment."); }
    finally { setIsSubmitting(false); }
  };

  const handleCancelBooking = (bookingId, dateString, timeString) => {
    try {
      const dateOnly = typeof dateString === 'string' ? dateString.split('T')[0] : new Date(dateString).toISOString().split('T')[0];
      const appointmentDateTime = new Date(`${dateOnly}T${timeString}+07:00`);
      const now = new Date();
      
      const diffInHours = (appointmentDateTime - now) / (1000 * 60 * 60);

      let confirmMessage = "";
      let isPenalty = false;

      if (diffInHours < 1 && diffInHours > 0) { 
        confirmMessage = "WARNING: You are canceling less than 1 hour before your appointment. You will lose 1 Booking Credit. Are you sure you want to proceed?";
        isPenalty = true;
      } else {
        confirmMessage = "Safe to cancel: You are canceling more than 1 hour before your schedule. Your Booking Credits will not be affected. Proceed?";
        isPenalty = false;
      }

      setCancelData({ isOpen: true, bookingId: bookingId, message: confirmMessage, isPenalty: isPenalty });
    } catch (error) {
      toast.error("Error calculating cancellation time.");
    }
  };

  const executeCancellation = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put("http://localhost:5000/api/bookings/cancel", 
        { bookingId: cancelData.bookingId, customerId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Booking cancelled successfully.");
      fetchHistory();
      setCancelData({ isOpen: false, bookingId: null, message: "", isPenalty: false });
      fetchUserProfile(); 
    } catch (error) { toast.error("Failed to cancel booking."); }
  };

  const confirmLogout = () => {
    logout();
    navigate("/login");
  };

  const formatHistoryDate = (dateString) => {
    if (!dateString) return { day: "-", month: "-" };
    try {
      const dateOnly = typeof dateString === 'string' ? dateString.split('T')[0] : new Date(dateString).toISOString().split('T')[0];
      const [year, month, day] = dateOnly.split('-');
      const date = new Date(year, month - 1, day);
      const formattedMonth = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
      return { day, month: formattedMonth };
    } catch (e) {
      return { day: "-", month: "-" };
    }
  };

  const filteredHistory = (Array.isArray(bookingHistory) ? bookingHistory : []).filter((booking) => {
    if (!booking) return false;
    if (historyFilter === "All") return true;
    if (historyFilter === "Completed" && booking.status === "Completed") return true;
    if (historyFilter === "Penalty" && (booking.status === "Cancelled" || booking.status === "No-Show")) return true;
    return false;
  });

  const getDayName = (dateObj) => dateObj.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const getDayNumber = (dateObj) => dateObj.getDate();

  return (
    <div className="min-h-screen bg-barber-bg font-sans text-barber-text relative">
      
      {/* --- LEGITIMATE TOP NAVBAR --- */}
      <nav className="bg-barber-surface border-b border-barber-muted/20 px-6 py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-barber-accent font-serif italic tracking-wide cursor-pointer" onClick={() => setActiveTab("home")}>
            BarberHub
          </h1>

          <div className="hidden md:flex items-center gap-8 font-semibold text-sm">
            <button onClick={() => setActiveTab("home")} className={`transition-colors ${activeTab === "home" ? "text-barber-accent" : "text-barber-muted hover:text-barber-text"}`}>
              Home
            </button>
            <button onClick={() => setActiveTab("history")} className={`transition-colors ${activeTab === "history" ? "text-barber-accent" : "text-barber-muted hover:text-barber-text"}`}>
              History
            </button>
            <button onClick={() => setActiveTab("contact")} className={`transition-colors ${activeTab === "contact" ? "text-barber-accent" : "text-barber-muted hover:text-barber-text"}`}>
              Contact Admin
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab("profile")} 
              className={`w-10 h-10 rounded-full font-bold text-lg flex items-center justify-center transition-all ${activeTab === "profile" ? "bg-barber-accent text-barber-bg ring-2 ring-barber-accent/50 ring-offset-2 ring-offset-barber-surface" : "bg-barber-bg border border-barber-muted/30 text-barber-text hover:border-barber-accent"}`}
              title="My Profile"
            >
              {getInitials(profileData.fullName || user?.name)}
            </button>
            <button onClick={() => setIsLogoutModalOpen(true)} className="text-barber-muted hover:text-red-400 transition-colors p-2" title="Logout">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="max-w-6xl mx-auto px-6 mt-8 pb-20">
        
        {/* VIEW 1: HOME (BOOKING) */}
        {activeTab === "home" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
              <div>
                <h2 className="text-3xl font-bold font-serif text-barber-text mb-2">
                  Hi, <span className="text-barber-accent">{displayName}</span>
                </h2>
                <p className="text-barber-muted">Ready for a fresh cut?</p>
              </div>

              <div className="bg-barber-surface border border-barber-muted/20 rounded-xl p-4 flex items-center gap-4 shadow-sm w-full md:w-auto">
                <div className={`${profileData.isBlocked ? "bg-red-500/10 text-red-500" : "bg-barber-accent/10 text-barber-accent"} p-3 rounded-xl flex-shrink-0`}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-barber-muted uppercase tracking-wider">Booking Credits</p>
                  <p className={`text-lg font-bold ${profileData.isBlocked ? "text-red-500" : "text-barber-text"}`}>
                    {profileData.isBlocked ? "0" : currentLifeCount} / 3 Left
                  </p>
                </div>
              </div>
            </div>

            {upcomingAppointment && (
              <div className="mb-10">
                <h3 className="text-xl font-bold font-serif text-barber-text mb-4">Upcoming Appointment</h3>
                <div className="bg-barber-surface border border-barber-muted/20 rounded-2xl p-6 shadow-lg max-w-2xl">
                  <div className="flex justify-between items-center mb-5 border-b border-barber-muted/10 pb-4">
                    <div className="flex items-center gap-4">
                      <img src={upcomingAppointment?.barber_image || "https://via.placeholder.com/150"} alt="Barber" className="w-14 h-14 rounded-xl object-cover border border-barber-muted/20" />
                      <div>
                        <h3 className="font-bold text-barber-text text-lg">{upcomingAppointment?.barber_name}</h3>
                        <p className="text-xs text-barber-muted flex items-center gap-1"><Star size={12} className="text-barber-accent"/> Barber</p>
                      </div>
                    </div>
                    <span className="bg-barber-accent/10 text-barber-accent px-3 py-1 rounded-md text-xs font-bold border border-barber-accent/20">Active</span>
                  </div>

                  <div className="bg-barber-bg rounded-xl p-4 flex justify-between items-center mb-4 border border-barber-muted/10">
                    <div className="w-1/2 border-r border-barber-muted/20">
                      <p className="text-xs text-barber-muted mb-1">Date</p>
                      <p className="font-semibold text-sm text-barber-text">
                        {formatHistoryDate(upcomingAppointment?.booking_date).day} {formatHistoryDate(upcomingAppointment?.booking_date).month}
                      </p>
                    </div>
                    <div className="w-1/2 pl-4">
                      <p className="text-xs text-barber-muted mb-1">Time</p>
                      <p className="font-semibold text-sm text-barber-accent">{upcomingAppointment?.start_time?.substring(0, 5) || "00:00"} WIB</p>
                    </div>
                  </div>

                  <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                    <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-400 font-medium leading-relaxed">
                      Note: Cancel &lt; 1 Hour or Late &gt; 20 Mins = Credit -1
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-barber-muted/10 flex justify-end">
                    <button 
                      onClick={() => handleCancelBooking(upcomingAppointment?.id, upcomingAppointment?.booking_date, upcomingAppointment?.start_time)}
                      className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors"
                    >
                      Cancel Booking
                    </button>
                  </div>
                </div>
              </div>
            )}

            <h3 className="text-xl font-bold font-serif text-barber-text mb-6">Select Your Barber</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.isArray(barbers) && barbers.map((barber) => {
                const rawSpecialty = (barber?.specialty || "").split("•")[0].trim();
                return (
                  <div key={barber.id} className="bg-barber-surface rounded-2xl overflow-hidden border border-barber-muted/20 flex flex-col sm:flex-row shadow-lg">
                    <img src={barber?.image || "https://via.placeholder.com/150"} alt={barber?.name} className="w-full sm:w-48 h-48 object-cover" />
                    <div className="p-6 flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-xl font-bold text-barber-text">{barber?.name}</h4>
                          <span className="bg-barber-bg px-2 py-1 rounded text-sm font-bold text-barber-accent flex items-center gap-1">★ {barber?.rating}</span>
                        </div>
                        <p className="text-sm text-barber-muted mb-4">{rawSpecialty}</p>
                      </div>
                      <button
                        onClick={() => handleOpenBooking(barber)}
                        className="w-full border border-barber-accent text-barber-accent py-2.5 rounded-lg font-semibold hover:bg-barber-accent hover:text-barber-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={profileData.isBlocked}
                      >
                        Book Appointment
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: HISTORY */}
        {activeTab === "history" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-barber-text mb-6">Booking History</h3>
            <div className="flex gap-6 border-b border-barber-muted/20 mb-6 pb-2">
              {["All", "Completed", "Penalty"].map((tab) => (
                <button key={tab} onClick={() => setHistoryFilter(tab)} className={`text-sm font-bold pb-2 transition-colors relative ${historyFilter === tab ? "text-barber-accent" : "text-barber-muted hover:text-barber-text"}`}>
                  {tab}{historyFilter === tab && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-barber-accent rounded-t-full"></div>}
                </button>
              ))}
            </div>

            {isLoadingHistory ? (
              <div className="text-center py-10 text-barber-muted animate-pulse">Loading history...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-10 text-barber-muted bg-barber-surface rounded-xl border border-barber-muted/10">No records found.</div>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((booking) => {
                  const { day, month } = formatHistoryDate(booking?.booking_date);
                  return (
                    <div key={booking.id} className="bg-barber-surface border border-barber-muted/20 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center gap-5">
                        <div className="bg-barber-bg border border-barber-muted/30 rounded-lg w-16 h-16 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-xl font-bold text-barber-text leading-none">{day}</span>
                          <span className="text-xs font-semibold text-barber-muted">{month}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-barber-text">{booking?.barber_name}</h4>
                          <div className="flex items-center text-sm text-barber-muted gap-1 mt-1">
                            <Clock size={14} /> {booking?.start_time?.substring(0, 5) || "00:00"} WIB
                          </div>
                        </div>
                        <div>
                          {booking.status === "Upcoming" && <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded">UPCOMING</span>}
                          {booking.status === "Completed" && <span className="text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded">COMPLETED</span>}
                          {booking.status === "Cancelled" && <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded border border-red-500/20">CANCELLED</span>}
                          {booking.status === "No-Show" && <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded border border-yellow-500/20">NO-SHOW PENALTY</span>}
                        </div>
                      </div>
                      {booking.status === "Upcoming" && (
                        <div className="mt-4 pt-4 border-t border-barber-muted/10 flex justify-end">
                          <button onClick={() => handleCancelBooking(booking.id, booking.booking_date, booking.start_time)} className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors">
                            Cancel Booking
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: PROFILE */}
        {activeTab === "profile" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto">
            <div className="bg-barber-surface border border-barber-muted/20 rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="h-32 bg-gradient-to-r from-barber-bg via-barber-surface to-barber-accent/20 border-b border-barber-muted/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-barber-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              </div>
              <div className="px-8 pb-8 relative">
                <div className="flex justify-between items-end -mt-12 mb-8">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-barber-accent to-yellow-600 p-1 shadow-xl">
                    <div className="w-full h-full bg-barber-surface rounded-xl flex items-center justify-center text-3xl font-bold font-serif text-barber-text">
                      {getInitials(profileData.fullName || user?.name)}
                    </div>
                  </div>
                  <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="bg-barber-bg border border-barber-muted/30 hover:border-barber-accent text-barber-text px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm">
                    {isEditingProfile ? <><X size={16} className="text-red-400" /> Cancel</> : <><Edit size={16} className="text-barber-accent" /> Edit Profile</>}
                  </button>
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleProfileUpdate} className="space-y-5 animate-in fade-in bg-barber-bg/50 p-6 rounded-2xl border border-barber-muted/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-barber-muted uppercase mb-2 tracking-wider ml-1">Full Name</label>
                        <div className="relative">
                          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-barber-muted" />
                          <input type="text" value={profileData.fullName} onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })} className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-barber-surface border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none font-semibold transition-colors" required />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-barber-muted uppercase mb-2 tracking-wider ml-1">WhatsApp Number</label>
                        <div className="relative">
                          <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-barber-muted" />
                          <input type="text" value={profileData.whatsapp} onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value })} className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-barber-surface border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none font-semibold transition-colors" required />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-barber-muted/50 uppercase mb-2 tracking-wider ml-1">Email (Permanent)</label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-barber-muted/50" />
                        <input type="email" value={profileData.email} disabled className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-barber-bg border border-barber-muted/10 text-barber-muted cursor-not-allowed font-semibold opacity-70" />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-barber-accent text-barber-bg py-4 rounded-xl font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 mt-6">
                      <Save size={20} /> Save Changes
                    </button>
                  </form>
                ) : (
                  <div className="animate-in fade-in space-y-8">
                    <div>
                      <h3 className="text-3xl font-bold font-serif text-barber-text">{profileData.fullName}</h3>
                      <p className="text-barber-accent font-semibold text-sm flex items-center gap-1.5 mt-1"><ShieldCheck size={16} /> Verified Customer</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-barber-bg border border-barber-muted/10 rounded-2xl p-5 flex items-center gap-5">
                        <div className="bg-barber-surface p-3.5 rounded-xl text-barber-muted"><Phone size={20} /></div>
                        <div><p className="text-xs font-bold text-barber-muted uppercase tracking-wider mb-0.5">WhatsApp</p><p className="text-lg font-semibold text-barber-text">{profileData.whatsapp}</p></div>
                      </div>
                      <div className="bg-barber-bg border border-barber-muted/10 rounded-2xl p-5 flex items-center gap-5">
                        <div className="bg-barber-surface p-3.5 rounded-xl text-barber-muted"><Mail size={20} /></div>
                        <div><p className="text-xs font-bold text-barber-muted uppercase tracking-wider mb-0.5">Email</p><p className="text-lg font-semibold text-barber-text truncate max-w-[200px]" title={profileData.email}>{profileData.email}</p></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: CONTACT ADMIN (MVP CHAT REPLACEMENT) */}
        {activeTab === "contact" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-2xl mx-auto text-center mt-10">
            <div className="bg-barber-surface border border-barber-muted/20 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-barber-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
              
              <div className="relative z-10">
                <div className="bg-green-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle size={36} className="text-green-500" />
                </div>
                
                <h2 className="text-3xl font-bold font-serif text-barber-text mb-4">Contact Admin</h2>
                <p className="text-barber-muted mb-10 max-w-md mx-auto">
                  Need to reschedule, report a delay, or ask about our services? Chat with us directly on WhatsApp. We typically reply within a few minutes during business hours.
                </p>

                {/* Real QR Code Box */}
                <div className="bg-white w-48 h-48 mx-auto rounded-2xl flex flex-col items-center justify-center mb-10 p-2 shadow-xl hover:scale-105 transition-transform duration-300">
                   <img 
                      src={waQrCode} 
                      alt="WhatsApp QR Code" 
                      className="w-full h-full object-contain rounded-xl"
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <a 
                    href="https://wa.me/qr/VRYJ7ZTSLI7WG1" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-green-500/20 w-full sm:w-auto"
                  >
                    <MessageCircle size={20} /> Chat on WhatsApp
                  </a>
                  <a 
                    href="tel:+628112190743" 
                    className="bg-barber-bg border border-barber-muted/30 hover:border-barber-accent text-barber-text font-bold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 w-full sm:w-auto"
                  >
                    <Phone size={20} /> +62 811-2190-743
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* --- MODAL 1: BOOKING POPUP --- */}
      {isBookingModalOpen && selectedBarber && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
          <div className="bg-barber-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            <div className="p-6 border-b border-barber-muted/20 flex justify-between items-start">
              <div className="flex gap-4 items-center">
                <img src={selectedBarber?.image || "https://via.placeholder.com/150"} alt={selectedBarber?.name} className="w-12 h-12 rounded-full object-cover border border-barber-accent" />
                <div>
                  <h3 className="text-xl font-bold font-serif text-barber-text">{selectedBarber?.name}</h3>
                  <p className="text-sm text-barber-accent font-semibold">{selectedBarber?.specialty ? selectedBarber.specialty.split("•")[0].trim() : ""}</p>
                </div>
              </div>
              <button onClick={() => setIsBookingModalOpen(false)} className="text-barber-muted hover:text-red-400 p-1 bg-barber-bg rounded-full"><X size={20} /></button>
            </div>

            <div className="p-6">
              {!selectedTimeForConfirm ? (
                <>
                  <div className="mb-8">
                    <h4 className="text-sm font-bold text-barber-text uppercase tracking-wider mb-4">Select Date</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x [&::-webkit-scrollbar]:hidden">
                      {calendarDays.map((dateObj, idx) => {
                        const dateStr = formatDateForAPI(dateObj);
                        const isSelected = selectedDate === dateStr;
                        return (
                          <button key={idx} onClick={() => handleDateSelect(dateObj)} className={`flex flex-col items-center min-w-[4.5rem] py-3 rounded-xl border snap-start transition-all ${isSelected ? "bg-barber-accent border-barber-accent text-barber-bg shadow-md" : "bg-barber-bg border-barber-muted/20 text-barber-text"}`}>
                            <span className="text-xs font-semibold mb-1">{idx === 0 ? "Today" : getDayName(dateObj)}</span>
                            <span className="text-xl font-bold">{getDayNumber(dateObj)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-barber-text uppercase tracking-wider mb-4">Available Slots</h4>
                  {isLoadingSlots ? (
                    <div className="py-8 text-center text-barber-accent animate-pulse font-semibold">Searching schedule...</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="py-8 text-center text-red-400 font-semibold bg-red-500/10 rounded-xl border border-red-500/20">Fully booked for this date.</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                      {availableSlots.map((timeStr) => (
                        <button key={timeStr} onClick={() => handleTimeClick(timeStr)} className="py-3 px-2 text-center rounded-xl font-bold border border-barber-muted/30 bg-barber-bg text-barber-text hover:border-barber-accent hover:text-barber-accent transition-all">
                          {timeStr.substring(0, 5)}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="animate-in fade-in zoom-in duration-200">
                  <div className="bg-barber-bg rounded-xl border border-barber-muted/20 p-6 mb-6">
                    <h4 className="text-center font-bold text-barber-text mb-4 uppercase tracking-wider text-sm border-b border-barber-muted/20 pb-4">Booking Summary</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center"><span className="text-barber-muted text-sm">Barber</span><span className="font-bold text-barber-text">{selectedBarber?.name}</span></div>
                      <div className="flex justify-between items-center"><span className="text-barber-muted text-sm">Date</span><span className="font-bold text-barber-text">{new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" })}</span></div>
                      <div className="flex justify-between items-center"><span className="text-barber-muted text-sm">Time</span><span className="font-bold text-barber-text text-lg text-barber-accent">{selectedTimeForConfirm.substring(0, 5)} WIB</span></div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setSelectedTimeForConfirm(null)} disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl font-semibold text-barber-text bg-barber-bg border border-barber-muted/30 hover:bg-barber-surface flex items-center justify-center gap-2"><ArrowLeft size={18} /> Back</button>
                    <button onClick={executeBooking} disabled={isSubmitting} className="flex-[2] py-3.5 rounded-xl font-bold text-barber-bg bg-barber-accent hover:bg-opacity-90 flex items-center justify-center gap-2">
                      {isSubmitting ? "Processing..." : <><CheckCircle2 size={18} /> Confirm</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: CANCEL WARNING --- */}
      {cancelData.isOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-barber-surface border border-barber-muted/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-full ${cancelData.isPenalty ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-400"}`}>
                {cancelData.isPenalty ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
              </div>
              <h3 className="text-xl font-bold font-serif text-barber-text">{cancelData.isPenalty ? "Penalty Warning" : "Free Cancellation"}</h3>
            </div>
            <p className="text-barber-muted text-sm leading-relaxed mb-8">{cancelData.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setCancelData({ ...cancelData, isOpen: false })} className="px-5 py-2.5 rounded-xl font-semibold text-barber-text hover:bg-barber-muted/10 transition-colors">Go Back</button>
              <button onClick={executeCancellation} className={`px-5 py-2.5 rounded-xl font-bold text-barber-bg transition-all ${cancelData.isPenalty ? "bg-red-500 hover:bg-red-400" : "bg-barber-accent hover:bg-opacity-90"}`}>Yes, Cancel It</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: LOGOUT CONFIRMATION --- */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-barber-surface border border-barber-muted/20 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200 p-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-500/10 text-red-400">
              <LogOut size={32} />
            </div>
            <h3 className="text-xl font-bold font-serif text-barber-text mb-2">Sign Out</h3>
            <p className="text-barber-muted text-sm leading-relaxed mb-8">Are you sure you want to sign out of BarberHub?</p>
            <div className="flex gap-3">
              <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-barber-text bg-barber-bg hover:bg-barber-muted/10 transition-colors border border-barber-muted/20">Cancel</button>
              <button onClick={confirmLogout} className="flex-1 py-3 rounded-xl font-bold text-barber-bg bg-red-500 hover:bg-red-400 transition-all">Yes, Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}