import { useState, useEffect } from "react";
import {
  Users,
  CalendarCheck,
  TrendingUp,
  LogOut,
  Plus,
  Edit,
  Trash2,
  X,
  UploadCloud,
  Calendar,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Phone,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("barbers");

  // --- BARBER STATES ---
  const [barbers, setBarbers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    specialty: "",
    experienceYears: "",
    price: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // --- SCHEDULE STATES ---
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // --- DAILY OPERATIONS STATES ---
  const [dailyBookings, setDailyBookings] = useState([]);
  const [adminDate, setAdminDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);

  // --- CONFIRMATION DIALOGS ---
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    bookingId: null,
    customerId: null,
    newStatus: null,
  });

  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    barberId: null,
    barberName: "",
  });

  const [resetDialog, setResetDialog] = useState({
    isOpen: false,
    customerId: null,
    customerName: "",
  });

  const [editingBarberId, setEditingBarberId] = useState(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // --- CUSTOMER STATES ---
  const [customers, setCustomers] = useState([]);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:5000/api/admin/customers",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setCustomers(response.data);
    } catch (error) {
      toast.error("Failed to load customer list.");
    }
  };

  const handleResetLife = (customerId, customerName) => {
    setResetDialog({ isOpen: true, customerId, customerName });
  };

  const executeResetLife = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/admin/customers/${resetDialog.customerId}/reset`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      toast.success(`Booking credits for ${resetDialog.customerName} successfully reset!`);
      fetchCustomers();
      setResetDialog({ isOpen: false, customerId: null, customerName: "" });
    } catch (error) {
      toast.error("Failed to reset booking credits.");
    }
  };

  useEffect(() => {
    fetchBarbers();
  }, []);

  useEffect(() => {
    if (activeTab === "daily") fetchDailyBookings();
    if (activeTab === "customers") fetchCustomers();
  }, [activeTab, adminDate]);

  const getInitials = (name) => {
    if (!name) return "C";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  // --- FETCHERS ---
  const fetchBarbers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/barbers");
      setBarbers(response.data);
    } catch (error) {
      toast.error("Failed to load barbers.");
    }
  };

  const fetchDailyBookings = async () => {
    setIsLoadingDaily(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/api/admin/bookings?date=${adminDate}`,
      );
      setDailyBookings(response.data);
    } catch (error) {
      toast.error("Failed to load daily schedule.");
    } finally {
      setIsLoadingDaily(false);
    }
  };

  const handleStatusUpdateClick = (bookingId, newStatus, customerId) => {
    if (newStatus === "No-Show") {
      setConfirmDialog({ isOpen: true, bookingId, customerId, newStatus });
    } else {
      executeStatusUpdate(bookingId, newStatus, customerId);
    }
  };

  const executeStatusUpdate = async (bookingId, newStatus, customerId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "http://localhost:5000/api/admin/bookings/status",
        { bookingId, status: newStatus, customerId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(`Booking marked as: ${newStatus}`);
      fetchDailyBookings();
      setConfirmDialog({
        isOpen: false,
        bookingId: null,
        customerId: null,
        newStatus: null,
      });
    } catch (error) {
      toast.error("Failed to update status.");
    }
  };

  // --- ADD/EDIT BARBER LOGIC ---
  const handleInputChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0])
      handleFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  };

  const handleFile = (file) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!editingBarberId && !imageFile)
      return toast.error("Please upload a photo!");

    const submitData = new FormData();
    submitData.append("fullName", formData.fullName);
    submitData.append("specialty", formData.specialty);
    submitData.append("experienceYears", formData.experienceYears);
    submitData.append("price", formData.price);
    if (imageFile) submitData.append("image", imageFile);

    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      if (editingBarberId) {
        await axios.put(
          `http://localhost:5000/api/barbers/${editingBarberId}`,
          submitData,
          config,
        );
        toast.success("Barber updated successfully!");
      } else {
        await axios.post("http://localhost:5000/api/barbers", submitData, config);
        toast.success("Barber added successfully!");
      }

      setIsModalOpen(false);
      setEditingBarberId(null);
      setFormData({ fullName: "", specialty: "", experienceYears: "", price: "" });
      setImageFile(null);
      setImagePreview(null);
      fetchBarbers();
    } catch (error) {
      toast.error(
        editingBarberId ? "Failed to update barber!" : "Failed to add barber!",
      );
    }
  };

  const handleDeleteClick = (barberId, barberName) => {
    setDeleteDialog({ isOpen: true, barberId, barberName });
  };

  const handleEditClick = (barber) => {
    const parts = barber.specialty
      ? barber.specialty.split("•").map((p) => p.trim())
      : [""];
    const rawSpecialty = parts[0] || "";
    const rawExp = parts[1] ? parseInt(parts[1].replace(/[^0-9]/g, "")) : 0;
    const rawPrice = parts[2] ? parseInt(parts[2].replace(/[^0-9]/g, "")) : 0;

    setFormData({
      fullName: barber.name,
      specialty: rawSpecialty,
      experienceYears: barber.experience_years || rawExp,
      price: barber.price || rawPrice,
    });
    setImagePreview(barber.image);
    setImageFile(null);
    setEditingBarberId(barber.id);
    setIsModalOpen(true);
  };

  const executeDeleteBarber = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/barbers/${deleteDialog.barberId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success(`${deleteDialog.barberName} deleted successfully!`);
      fetchBarbers();
      setDeleteDialog({ isOpen: false, barberId: null, barberName: "" });
    } catch (error) {
      toast.error("Failed to delete barber. Ensure the backend is running!");
    }
  };

  // --- SCHEDULE LOGIC ---
  const fetchSchedule = async (barber, date) => {
    setIsLoadingSchedule(true);
    try {
      const response = await axios.get(
        `http://localhost:5000/api/availability?barberId=${barber.id}&date=${date}`,
      );
      setAvailableSlots(response.data);
    } catch (error) {
      toast.error("Failed to load schedule.");
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const handleOpenSchedule = (barber) => {
    setSelectedBarber(barber);
    setIsScheduleModalOpen(true);
    fetchSchedule(barber, selectedDate);
  };

  const confirmLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-barber-bg font-sans text-barber-text pb-20 relative">
      <nav className="bg-barber-surface border-b border-barber-muted/20 px-6 py-4 sticky top-0 z-40 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-barber-accent font-serif italic tracking-wide">
            BarberHub
          </h1>
          <span className="hidden sm:inline-block bg-barber-accent/10 text-barber-accent text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Admin Console
          </span>
        </div>
        <button
          onClick={() => setIsLogoutModalOpen(true)}
          className="p-2 text-barber-muted hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {/* TAB SWITCHER */}
        <div className="flex gap-4 mb-8 border-b border-barber-muted/20 pb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("barbers")}
            className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
              activeTab === "barbers"
                ? "bg-barber-accent text-barber-bg"
                : "bg-barber-surface text-barber-text hover:bg-barber-muted/10"
            }`}
          >
            Barber Management
          </button>
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
              activeTab === "daily"
                ? "bg-barber-accent text-barber-bg"
                : "bg-barber-surface text-barber-text hover:bg-barber-muted/10"
            }`}
          >
            Daily Operations
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
              activeTab === "customers"
                ? "bg-barber-accent text-barber-bg"
                : "bg-barber-surface text-barber-text hover:bg-barber-muted/10"
            }`}
          >
            Customers & Penalties
          </button>
        </div>

        {/* TAB 1: MANAJEMEN BARBER */}
        {activeTab === "barbers" && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-barber-surface rounded-xl border border-barber-muted/20 overflow-hidden">
              <div className="p-6 border-b border-barber-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-barber-surface gap-4">
                <h3 className="text-xl font-bold text-barber-text">
                  Barber Management
                </h3>
                <button
                  onClick={() => {
                    setEditingBarberId(null);
                    setFormData({ fullName: "", specialty: "", experienceYears: "", price: "" });
                    setImagePreview(null);
                    setImageFile(null);
                    setIsModalOpen(true);
                  }}
                  className="bg-barber-accent text-barber-bg px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-opacity-90 transition-all active:scale-95 w-full sm:w-auto justify-center"
                >
                  <Plus size={18} /> Add Barber
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-barber-bg text-barber-muted text-sm uppercase tracking-wider border-b border-barber-muted/20">
                      <th className="p-4 font-semibold">Name</th>
                      <th className="p-4 font-semibold">Specialty</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barbers.map((barber) => (
                      <tr
                        key={barber.id}
                        className="border-b border-barber-muted/10 hover:bg-barber-bg/50 transition-colors"
                      >
                        <td className="p-4 font-semibold text-barber-text flex items-center gap-3 min-w-[200px]">
                          <img
                            src={barber.image}
                            alt={barber.name}
                            className="w-10 h-10 rounded-full object-cover border border-barber-muted/30"
                          />
                          {barber.name}
                        </td>
                        <td className="p-4 text-barber-text/70 text-sm min-w-[200px]">
                          {barber.specialty}
                        </td>
                        <td className="p-4 flex justify-end gap-3 text-barber-muted">
                          <button
                            onClick={() => handleOpenSchedule(barber)}
                            title="Check Schedule"
                            className="hover:text-blue-400 bg-barber-bg p-2 rounded-md transition-colors"
                          >
                            <Calendar size={18} />
                          </button>
                          <button
                            onClick={() => handleEditClick(barber)}
                            title="Edit"
                            className="hover:text-barber-accent bg-barber-bg p-2 rounded-md transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(barber.id, barber.name)}
                            title="Delete"
                            className="hover:text-red-400 bg-barber-bg p-2 rounded-md transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: OPERASIONAL HARIAN */}
        {activeTab === "daily" && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-2xl font-bold font-serif text-barber-text">
                Daily Schedule
              </h2>
              <div className="bg-barber-surface border border-barber-muted/20 rounded-lg p-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={adminDate}
                  onChange={(e) => setAdminDate(e.target.value)}
                  className="bg-transparent text-barber-text outline-none font-semibold cursor-pointer w-full"
                />
              </div>
            </div>

            {isLoadingDaily ? (
              <div className="text-center py-10 text-barber-accent animate-pulse">
                Loading operational data...
              </div>
            ) : dailyBookings.length === 0 ? (
              <div className="bg-barber-surface border border-barber-muted/20 rounded-xl p-10 text-center">
                <CalendarCheck size={48} className="mx-auto text-barber-muted mb-4 opacity-50" />
                <p className="text-barber-muted font-semibold">
                  No bookings for this date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {dailyBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-barber-surface border border-barber-muted/20 rounded-xl p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4"
                  >
                    <div className="flex items-center gap-6 w-full lg:w-auto">
                      <div className="bg-barber-bg border border-barber-muted/30 p-3 rounded-lg text-center min-w-[5rem]">
                        <p className="text-barber-accent font-bold text-xl">
                          {booking.start_time.substring(0, 5)}
                        </p>
                        <p className="text-xs text-barber-muted">WIB</p>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-barber-text">
                          {booking.customer_name}
                        </h4>
                        <p className="text-sm text-barber-muted flex flex-col sm:flex-row sm:gap-2 mt-1">
                          <span>Barber: <strong>{booking.barber_name}</strong></span> 
                          <span className="hidden sm:inline">|</span>
                          <span className="text-green-400">WA: {booking.customer_phone}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full lg:w-auto justify-start lg:justify-end mt-2 lg:mt-0">
                      {booking.status === "Upcoming" ? (
                        <>
                          <button
                            onClick={() => handleStatusUpdateClick(booking.id, "Completed", booking.customer_id)}
                            className="bg-green-500/10 text-green-400 border border-green-500/30 px-4 py-2 rounded-lg font-bold hover:bg-green-500 hover:text-white transition-all flex items-center gap-2 text-sm flex-1 lg:flex-none justify-center"
                          >
                            <CheckCircle size={18} /> Completed
                          </button>
                          <button
                            onClick={() => handleStatusUpdateClick(booking.id, "No-Show", booking.customer_id)}
                            className="bg-red-500/10 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 text-sm flex-1 lg:flex-none justify-center"
                          >
                            <AlertTriangle size={18} /> No-Show
                          </button>
                        </>
                      ) : (
                        <span
                          className={`px-4 py-2 rounded-lg font-bold border text-sm w-full lg:w-auto text-center ${
                            booking.status === "Completed"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : booking.status === "No-Show"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-barber-bg text-barber-muted border-barber-muted/20"
                          }`}
                        >
                          {booking.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MANAJEMEN PELANGGAN */}
        {activeTab === "customers" && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold font-serif text-barber-text">
                  Customer List
                </h2>
                <p className="text-sm text-barber-muted mt-1">
                  Manage booking credits and blocked statuses.
                </p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <div className="bg-barber-surface border border-barber-muted/20 px-4 py-2 rounded-lg flex items-center gap-3 shadow-sm flex-1 md:flex-none justify-center">
                  <Users size={18} className="text-barber-accent" />
                  <div>
                    <p className="text-[10px] text-barber-muted font-bold uppercase tracking-wider">Total</p>
                    <p className="text-lg font-bold text-barber-text leading-none">{customers.length}</p>
                  </div>
                </div>
                <div className="bg-red-950/20 border border-red-500/20 px-4 py-2 rounded-lg flex items-center gap-3 shadow-sm flex-1 md:flex-none justify-center">
                  <ShieldCheck size={18} className="text-red-400" />
                  <div>
                    <p className="text-[10px] text-red-400/70 font-bold uppercase tracking-wider">Blocked</p>
                    <p className="text-lg font-bold text-red-400 leading-none">
                      {customers.filter((c) => c.is_blocked).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {customers.length === 0 ? (
              <div className="text-center py-10 bg-barber-surface rounded-xl border border-barber-muted/20">
                <Users size={48} className="mx-auto text-barber-muted/50 mb-4" />
                <p className="text-barber-muted font-semibold">
                  No customers registered yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {customers.map((cust) => (
                  <div
                    key={cust.id}
                    className="bg-barber-surface border border-barber-muted/20 rounded-2xl p-6 flex flex-col justify-between hover:border-barber-accent/50 transition-all shadow-sm group"
                  >
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-14 h-14 flex-shrink-0 rounded-2xl bg-gradient-to-br from-barber-accent/20 to-barber-bg border border-barber-accent/30 flex items-center justify-center text-xl font-bold font-serif text-barber-accent shadow-inner">
                        {getInitials(cust.full_name)}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-bold text-barber-text text-lg mb-1 flex items-center gap-2 truncate">
                          {cust.full_name}
                          {cust.is_blocked && (
                            <span className="flex h-2.5 w-2.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                          )}
                        </h4>
                        <div className="flex flex-col gap-1.5 text-xs text-barber-muted font-medium">
                          <span className="flex items-center gap-1.5">
                            <Phone size={12} className="text-barber-accent/70" /> {cust.whatsapp}
                          </span>
                          <span className="flex items-center gap-1.5 truncate">
                            <Mail size={12} className="text-barber-accent/70" /> {cust.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-barber-muted/10 pt-5">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-barber-muted uppercase tracking-wider mb-2">
                          Booking Credits
                        </span>
                        {cust.is_blocked ? (
                          <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 w-fit">
                            <AlertTriangle size={12} /> BLOCKED
                          </span>
                        ) : (
                          <div className="flex gap-1.5">
                            {[1, 2, 3].map((life) => (
                              <div
                                key={life}
                                className={`w-6 h-2 rounded-full transition-all ${
                                  life <= cust.life_count
                                    ? "bg-barber-accent shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                                    : "bg-barber-bg border border-barber-muted/20"
                                }`}
                              ></div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleResetLife(cust.id, cust.full_name)}
                        disabled={cust.life_count === 3 && !cust.is_blocked}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 flex-shrink-0 ${
                          cust.life_count === 3 && !cust.is_blocked
                            ? "bg-barber-bg text-barber-muted/50 cursor-not-allowed border border-barber-muted/10"
                            : "bg-barber-accent text-barber-bg hover:bg-opacity-90 active:scale-95 shadow-md shadow-barber-accent/20"
                        }`}
                      >
                        <RefreshCw
                          size={14}
                          className={
                            cust.life_count !== 3 || cust.is_blocked
                              ? "group-hover:animate-[spin_2s_linear_infinite]"
                              : ""
                          }
                        />
                        {cust.life_count === 3 && !cust.is_blocked ? "Safe" : "Forgive"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODAL 1: ADD/EDIT BARBER --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-barber-surface border border-barber-muted/20 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-barber-muted/20">
              <h3 className="text-xl font-bold font-serif text-barber-text">
                {editingBarberId ? "Edit Barber" : "Add New Barber"}
              </h3>
              <button
                onClick={() => { setIsModalOpen(false); setImagePreview(null); setImageFile(null); }}
                className="text-barber-muted hover:text-red-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-barber-bg border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none"
                  placeholder="E.g: John Doe"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">
                  Specialty
                </label>
                <input
                  type="text"
                  name="specialty"
                  value={formData.specialty}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-barber-bg border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none"
                  placeholder="E.g: Classic Fades"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">
                    Experience (Years)
                  </label>
                  <input
                    type="number"
                    name="experienceYears"
                    value={formData.experienceYears}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="w-full px-4 py-3 rounded-lg bg-barber-bg border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none"
                    placeholder="E.g: 5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">
                    Service Price (Rp)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="1000"
                    className="w-full px-4 py-3 rounded-lg bg-barber-bg border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none"
                    placeholder="E.g: 75000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">
                  Barber Profile Photo
                </label>
                <div
                  className={`relative w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${
                    dragActive
                      ? "border-barber-accent bg-barber-accent/10"
                      : "border-barber-muted/40 hover:border-barber-accent/50 bg-barber-bg"
                  } overflow-hidden`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-barber-muted">
                      <UploadCloud size={32} className="mb-2" />
                      <p className="text-sm font-semibold text-barber-text/80">Drag & Drop photo here</p>
                      <p className="text-xs mt-1">or click to browse files</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-lg font-semibold text-barber-text hover:bg-barber-muted/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-barber-accent text-barber-bg px-6 py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all active:scale-95"
                >
                  Save Barber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: SCHEDULE VIEWER --- */}
      {isScheduleModalOpen && selectedBarber && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-barber-surface border border-barber-muted/20 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-barber-muted/20">
              <h3 className="text-xl font-bold font-serif text-barber-text">
                {selectedBarber.name}'s Schedule
              </h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-barber-muted hover:text-red-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); fetchSchedule(selectedBarber, e.target.value); }}
                className="w-full px-4 py-3 rounded-lg bg-barber-bg border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none mb-6"
                min={new Date().toISOString().split("T")[0]}
              />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {["09:00:00","10:00:00","11:00:00","12:00:00","13:00:00","14:00:00","15:00:00","16:00:00","17:00:00","18:00:00","19:00:00"].map((timeStr) => {
                  const isAvailable = availableSlots.includes(timeStr);
                  return (
                    <div
                      key={timeStr}
                      className={`py-2 px-1 text-center rounded-lg text-sm font-semibold border ${
                        isAvailable
                          ? "bg-green-500/10 border-green-500/30 text-green-400"
                          : "bg-red-500/10 border-red-500/30 text-red-400 line-through opacity-70"
                      }`}
                    >
                      {timeStr.substring(0, 5)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: NO-SHOW WARNING --- */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-barber-surface border border-barber-muted/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-500/10 p-3 rounded-full text-red-500">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-bold font-serif text-barber-text">
                  No-Show Confirmation
                </h3>
              </div>
              <p className="text-barber-text/80 text-sm leading-relaxed mb-8">
                Are you sure you want to mark this customer as{" "}
                <strong>No-Show</strong>?
                <br /><br />
                <span className="text-red-400 font-semibold">
                  This action will automatically deduct 1 Booking Credit from the customer.
                </span>
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDialog({ isOpen: false, bookingId: null, customerId: null, newStatus: null })}
                  className="px-5 py-2.5 rounded-xl font-semibold text-barber-text hover:bg-barber-muted/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeStatusUpdate(confirmDialog.bookingId, confirmDialog.newStatus, confirmDialog.customerId)}
                  className="px-5 py-2.5 rounded-xl font-bold text-barber-bg bg-red-500 hover:bg-red-400 transition-all active:scale-95 flex items-center gap-2"
                >
                  Yes, Mark as No-Show
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: DELETE BARBER WARNING --- */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-barber-surface border border-barber-muted/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-500/10 p-3 rounded-full text-red-500">
                  <Trash2 size={24} />
                </div>
                <h3 className="text-xl font-bold font-serif text-barber-text">
                  Delete Barber
                </h3>
              </div>
              <p className="text-barber-text/80 text-sm leading-relaxed mb-8">
                Are you sure you want to delete barber{" "}
                <strong>{deleteDialog.barberName}</strong>?
                <br /><br />
                <span className="text-red-400 font-semibold">
                  All schedules and booking data associated with this barber will be permanently deleted.
                </span>
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteDialog({ isOpen: false, barberId: null, barberName: "" })}
                  className="px-5 py-2.5 rounded-xl font-semibold text-barber-text hover:bg-barber-muted/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDeleteBarber}
                  className="px-5 py-2.5 rounded-xl font-bold text-barber-bg bg-red-500 hover:bg-red-400 transition-all active:scale-95 flex items-center gap-2"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: RESET LIFE CONFIRMATION --- */}
      {resetDialog.isOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-barber-surface border border-barber-muted/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-barber-accent/10 p-3 rounded-full text-barber-accent">
                  <RefreshCw size={24} />
                </div>
                <h3 className="text-xl font-bold font-serif text-barber-text">
                  Reset Booking Credits
                </h3>
              </div>
              <p className="text-barber-text/80 text-sm leading-relaxed mb-8">
                Are you sure you want to reset credits and unblock{" "}
                <strong>{resetDialog.customerName}</strong>?
                <br /><br />
                <span className="text-barber-accent font-semibold">
                  The customer's booking credits will be restored to 3 and the block will be lifted.
                </span>
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setResetDialog({ isOpen: false, customerId: null, customerName: "" })}
                  className="px-5 py-2.5 rounded-xl font-semibold text-barber-text hover:bg-barber-muted/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeResetLife}
                  className="px-5 py-2.5 rounded-xl font-bold text-barber-bg bg-barber-accent hover:bg-opacity-90 transition-all active:scale-95 flex items-center gap-2"
                >
                  <RefreshCw size={16} /> Yes, Forgive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 6: LOGOUT CONFIRMATION --- */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-barber-surface border border-barber-muted/20 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200 p-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-500/10 text-red-400">
              <LogOut size={32} />
            </div>
            <h3 className="text-xl font-bold font-serif text-barber-text mb-2">Sign Out</h3>
            <p className="text-barber-muted text-sm leading-relaxed mb-8">Are you sure you want to sign out of the Admin Console?</p>
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