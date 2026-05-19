import { useState, useEffect } from 'react';
import { CalendarCheck, Clock, Scissors, LogOut, X, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function CustomerDashboard() {
  const { user, logout } = useAuth(); 
  const navigate = useNavigate();

  // --- GLOBAL STATES ---
  const [activeTab, setActiveTab] = useState('booking');
  
  // --- BOOKING STATES ---
  const [currentLifeCount, setCurrentLifeCount] = useState(user?.life_count || 3);
  const [barbers, setBarbers] = useState([]);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTimeForConfirm, setSelectedTimeForConfirm] = useState(null);

  // --- HISTORY STATES ---
  const [bookingHistory, setBookingHistory] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('Semua'); 
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // --- NEW: CUSTOM CANCEL MODAL STATE ---
  const [cancelData, setCancelData] = useState({
    isOpen: false,
    bookingId: null,
    message: '',
    isPenalty: false
  });

  // --- FETCH INITIAL DATA ---
  useEffect(() => {
    fetchBarbers();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const fetchBarbers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/barbers');
      setBarbers(response.data);
    } catch (error) {
      console.error('Error fetching barbers:', error);
    }
  };

  const fetchHistory = async () => {
    if (!user?.id) return;
    setIsLoadingHistory(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/bookings/customer/${user.id}`);
      setBookingHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Gagal memuat riwayat booking.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // --- CALENDAR & BOOKING LOGIC ---
  const getNext7Days = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i); dates.push(d);
    }
    return dates;
  };
  const calendarDays = getNext7Days();
  const formatDateForAPI = (dateObj) => dateObj.toISOString().split('T')[0];

  const fetchAvailableSlots = async (barberId, dateString) => {
    setIsLoadingSlots(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/availability?barberId=${barberId}&date=${dateString}`);
      setAvailableSlots(response.data);
    } catch (error) {
      console.error('Error slots:', error);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleOpenBooking = (barber) => {
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
    if (!user || !user.id) return toast.error('Sesi tidak valid.');
    setIsSubmitting(true);
    try {
      const payload = { customerId: user.id, barberId: selectedBarber.id, date: selectedDate, time: selectedTimeForConfirm };
      const response = await axios.post('http://localhost:5000/api/bookings', payload);
      if (response.status === 201) {
        toast.success('Booking berhasil! Cek Riwayat Anda.');
        setIsBookingModalOpen(false);
        setActiveTab('history'); 
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal melakukan booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NEW: SMART CANCELLATION LOGIC (Opens Custom Modal) ---
  const handleCancelBooking = (bookingId, dateString, timeString) => {
    const aptDate = new Date(dateString);
    const formattedDate = aptDate.toISOString().split('T')[0];
    const appointmentDateTime = new Date(`${formattedDate}T${timeString}`);
    const now = new Date();
    
    const diffInHours = (appointmentDateTime - now) / (1000 * 60 * 60);
    
    let confirmMessage = "";
    let isPenalty = false;

    if (diffInHours < 3) {
      confirmMessage = "PERHATIAN: Anda membatalkan kurang dari 3 jam sebelum jadwal. Kesempatan Batal (Kredit Kursi) Anda akan berkurang 1. Yakin ingin melanjutkan?";
      isPenalty = true;
    } else {
      confirmMessage = "Aman: Anda membatalkan lebih dari 3 jam sebelum jadwal. Kredit Kursi Anda tidak akan berkurang. Yakin ingin melanjutkan?";
      isPenalty = false;
    }

    // Open the beautiful in-app modal instead of the ugly browser alert
    setCancelData({
      isOpen: true,
      bookingId: bookingId,
      message: confirmMessage,
      isPenalty: isPenalty
    });
  };

  // --- NEW: Actually executes the API call from the Modal ---
  const executeCancellation = async () => {
    try {
      const response = await axios.put('http://localhost:5000/api/bookings/cancel', {
        bookingId: cancelData.bookingId,
        customerId: user.id
      });
      
      if (response.status === 200) {
        toast.success(response.data.message);
        fetchHistory();
        setCancelData({ isOpen: false, bookingId: null, message: '', isPenalty: false }); 
        
        // SURGICAL FIX: Fetch fresh user data to update the life count instantly!
        const userRes = await axios.get(`http://localhost:5000/api/users/${user.id}`);
        setCurrentLifeCount(userRes.data.life_count);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal membatalkan booking.');
    }
  };

  // --- HELPERS FOR UI ---
  const getDayName = (dateObj) => dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
  const getDayNumber = (dateObj) => dateObj.getDate();
  const formatHistoryDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('id-ID', { month: 'short' }).toUpperCase();
    return { day, month };
  };

  const filteredHistory = bookingHistory.filter(booking => {
    if (historyFilter === 'Semua') return true;
    if (historyFilter === 'Selesai' && (booking.status === 'Completed' || booking.status === 'Upcoming')) return true; 
    if (historyFilter === 'Penalti' && (booking.status === 'Cancelled' || booking.status === 'Completed - Penalty')) return true;
    return false;
  });

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-barber-bg font-sans text-barber-text pb-20 relative">
      
      <nav className="bg-barber-surface border-b border-barber-muted/20 px-6 py-4 sticky top-0 z-40 flex justify-between items-center shadow-lg">
        <h1 className="text-2xl font-bold text-barber-accent font-serif italic tracking-wide">BarberHub</h1>
        <button onClick={handleLogout} className="text-barber-muted hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-medium">
          <span className="hidden sm:inline">Keluar</span>
          <LogOut size={18} />
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        {/* Header & Stats */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-bold font-serif text-barber-text mb-2">
              Selamat datang, <span className="text-barber-accent">{user?.name || 'Customer'}</span>.
            </h2>
            <p className="text-barber-text/70">Siap untuk menyegarkan gaya Anda hari ini?</p>
          </div>
          <div className="bg-barber-surface border border-barber-muted/20 rounded-xl p-4 flex items-center gap-4">
            <div className="bg-yellow-500/10 p-3 rounded-full text-yellow-500"><CalendarCheck size={24} /></div>
            <div>
              <p className="text-xs font-bold text-barber-muted uppercase tracking-wider">Status Akun</p>
              <p className="text-lg font-bold text-barber-text">{currentLifeCount} Kesempatan Batal</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <button 
            onClick={() => setActiveTab('booking')}
            className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
              activeTab === 'booking' ? 'bg-barber-accent text-barber-bg shadow-lg shadow-barber-accent/20 font-bold' : 'bg-barber-surface border border-barber-muted/20 text-barber-text hover:bg-barber-muted/10 font-semibold'
            }`}
          >
            <CalendarCheck size={32} className={activeTab === 'booking' ? '' : 'text-barber-muted'} />
            <span className="text-lg">Booking Baru</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('history')}
            className={`p-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
              activeTab === 'history' ? 'bg-barber-accent text-barber-bg shadow-lg shadow-barber-accent/20 font-bold' : 'bg-barber-surface border border-barber-muted/20 text-barber-text hover:bg-barber-muted/10 font-semibold'
            }`}
          >
            <Clock size={32} className={activeTab === 'history' ? '' : 'text-barber-muted'} />
            <span className="text-lg">Riwayat & Penalti</span>
          </button>
        </div>

        {/* TAB 1: BOOKING */}
        {activeTab === 'booking' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-2xl font-bold font-serif text-barber-text mb-6">Pilih Barber Anda</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {barbers.map((barber) => (
                <div key={barber.id} className="bg-barber-surface rounded-2xl overflow-hidden border border-barber-muted/20 flex flex-col sm:flex-row shadow-lg">
                  <img src={barber.image} alt={barber.name} className="w-full sm:w-48 h-48 object-cover" />
                  <div className="p-6 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-xl font-bold text-barber-text">{barber.name}</h4>
                        <span className="bg-barber-bg px-2 py-1 rounded text-sm font-bold text-barber-accent flex items-center gap-1">★ {barber.rating}</span>
                      </div>
                      <p className="text-sm text-barber-text/70 mb-4">{barber.specialty}</p>
                    </div>
                    <button onClick={() => handleOpenBooking(barber)} className="w-full border border-barber-accent text-barber-accent py-2.5 rounded-lg font-semibold hover:bg-barber-accent hover:text-barber-bg transition-colors">
                      Booking Jadwal
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <ArrowLeft className="text-barber-accent cursor-pointer" onClick={() => setActiveTab('booking')} />
              <h3 className="text-2xl font-bold text-barber-text">Riwayat Reservasi</h3>
            </div>

            <div className="flex gap-6 border-b border-barber-muted/20 mb-6 pb-2">
              {['Semua', 'Selesai', 'Penalti'].map(tab => (
                <button 
                  key={tab} onClick={() => setHistoryFilter(tab)}
                  className={`text-sm font-bold pb-2 transition-colors relative ${historyFilter === tab ? 'text-barber-accent' : 'text-barber-muted hover:text-barber-text'}`}
                >
                  {tab}{historyFilter === tab && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-barber-accent rounded-t-full"></div>}
                </button>
              ))}
            </div>

            {isLoadingHistory ? (
              <div className="text-center py-10 text-barber-muted animate-pulse">Memuat riwayat...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-10 text-barber-muted bg-barber-surface rounded-xl border border-barber-muted/10">Belum ada data di kategori ini.</div>
            ) : (
              <div className="space-y-4">
                {filteredHistory.map((booking) => {
                  const { day, month } = formatHistoryDate(booking.booking_date);
                  return (
                    <div key={booking.id} className="bg-barber-surface border border-barber-muted/20 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center gap-5">
                        <div className="bg-barber-bg border border-barber-muted/30 rounded-lg w-16 h-16 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-xl font-bold text-barber-text leading-none">{day}</span>
                          <span className="text-xs font-semibold text-barber-muted">{month}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-barber-text">{booking.barber_name}</h4>
                          <div className="flex items-center text-sm text-barber-muted gap-1 mt-1">
                            <Clock size={14} /> {booking.start_time.substring(0, 5)} WIB
                          </div>
                        </div>
                        <div>
                          {booking.status === 'Upcoming' && <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded">MENDATANG</span>}
                          {booking.status === 'Completed' && <span className="text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded">SELESAI</span>}
                          {booking.status === 'Cancelled' && <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded border border-red-500/20">DIBATALKAN</span>}
                        </div>
                      </div>

                      {booking.status === 'Upcoming' && (
                        <div className="mt-4 pt-4 border-t border-barber-muted/10 flex justify-end">
                          <button 
                            onClick={() => handleCancelBooking(booking.id, booking.booking_date, booking.start_time)}
                            className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors"
                          >
                            Batalkan Booking
                          </button>
                        </div>
                      )}

                      {booking.status === 'Cancelled' && (
                        <div className="mt-4 bg-red-950/30 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                          <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-red-400 font-medium leading-relaxed">
                            Penalti: Pembatalan Booking (Kredit Kursi -1)
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

      </div>

      {/* --- MODAL 1: BOOKING CREATION --- */}
      {isBookingModalOpen && selectedBarber && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
          <div className="bg-barber-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0">
            <div className="p-6 border-b border-barber-muted/20 flex justify-between items-start relative">
              <div className="flex gap-4 items-center">
                <img src={selectedBarber.image} alt={selectedBarber.name} className="w-12 h-12 rounded-full object-cover border border-barber-accent" />
                <div>
                  <h3 className="text-xl font-bold font-serif text-barber-text">{selectedBarber.name}</h3>
                  <p className="text-sm text-barber-accent font-semibold">{selectedBarber.specialty.split('•').pop().trim()}</p>
                </div>
              </div>
              <button onClick={() => setIsBookingModalOpen(false)} className="text-barber-muted hover:text-red-400 p-1 bg-barber-bg rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-6">
              {!selectedTimeForConfirm ? (
                <>
                  <div className="mb-8">
                    <h4 className="text-sm font-bold text-barber-text uppercase tracking-wider mb-4">Pilih Tanggal</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {calendarDays.map((dateObj, idx) => {
                        const dateStr = formatDateForAPI(dateObj);
                        const isSelected = selectedDate === dateStr;
                        return (
                          <button key={idx} onClick={() => handleDateSelect(dateObj)} className={`flex flex-col items-center min-w-[4.5rem] py-3 rounded-xl border snap-start transition-all ${isSelected ? 'bg-barber-accent border-barber-accent text-barber-bg shadow-md scale-105' : 'bg-barber-bg border-barber-muted/20 text-barber-text hover:border-barber-accent/50'}`}>
                            <span className={`text-xs font-semibold mb-1 ${isSelected ? 'text-barber-bg/80' : 'text-barber-muted'}`}>{idx === 0 ? 'Hari Ini' : getDayName(dateObj)}</span>
                            <span className="text-xl font-bold">{getDayNumber(dateObj)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-barber-text uppercase tracking-wider mb-4">Slot Tersedia</h4>
                  {isLoadingSlots ? (
                    <div className="py-8 text-center text-barber-accent animate-pulse font-semibold">Mencari jadwal kosong...</div>
                  ) : availableSlots.length === 0 ? (
                    <div className="py-8 text-center text-red-400 font-semibold bg-red-500/10 rounded-xl border border-red-500/20">Maaf, jadwal penuh pada tanggal ini.</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {availableSlots.map((timeStr) => (
                        <button key={timeStr} onClick={() => handleTimeClick(timeStr)} className="py-3 px-2 text-center rounded-xl font-bold border border-barber-muted/30 bg-barber-bg text-barber-text hover:border-barber-accent hover:text-barber-accent transition-all active:scale-95">{timeStr.substring(0, 5)}</button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="animate-in fade-in zoom-in duration-200">
                  <div className="bg-barber-bg rounded-xl border border-barber-muted/20 p-6 mb-6">
                    <h4 className="text-center font-bold text-barber-text mb-4 uppercase tracking-wider text-sm border-b border-barber-muted/20 pb-4">Ringkasan Booking</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center"><span className="text-barber-muted text-sm">Barber</span><span className="font-bold text-barber-text">{selectedBarber.name}</span></div>
                      <div className="flex justify-between items-center"><span className="text-barber-muted text-sm">Tanggal</span><span className="font-bold text-barber-text">{new Date(selectedDate).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
                      <div className="flex justify-between items-center"><span className="text-barber-muted text-sm">Jam</span><span className="font-bold text-barber-text text-lg text-barber-accent">{selectedTimeForConfirm.substring(0, 5)} WIB</span></div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setSelectedTimeForConfirm(null)} disabled={isSubmitting} className="flex-1 py-3.5 rounded-xl font-semibold text-barber-text bg-barber-bg border border-barber-muted/30 hover:bg-barber-surface transition-colors disabled:opacity-50 flex items-center justify-center gap-2"><ArrowLeft size={18} /> Kembali</button>
                    <button onClick={executeBooking} disabled={isSubmitting} className="flex-[2] py-3.5 rounded-xl font-bold text-barber-bg bg-barber-accent hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                      {isSubmitting ? 'Memproses...' : <><CheckCircle2 size={18} /> Konfirmasi</>}
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
                  {cancelData.isPenalty ? 'Konfirmasi Penalti' : 'Konfirmasi Pembatalan'}
                </h3>
              </div>
              
              <p className="text-barber-text/80 text-sm leading-relaxed mb-8">
                {cancelData.message}
              </p>
              
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setCancelData({ ...cancelData, isOpen: false })}
                  className="px-5 py-2.5 rounded-xl font-semibold text-barber-text hover:bg-barber-muted/10 transition-colors"
                >
                  Kembali
                </button>
                <button 
                  onClick={executeCancellation}
                  className={`px-5 py-2.5 rounded-xl font-bold text-barber-bg transition-all active:scale-95 ${
                    cancelData.isPenalty ? 'bg-red-500 hover:bg-red-400' : 'bg-barber-accent hover:bg-opacity-90'
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