import { useState, useEffect } from 'react';
import { Users, CalendarCheck, TrendingUp, LogOut, Plus, Edit, Trash2, X, UploadCloud, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('barbers'); // 'barbers' or 'daily'

  // --- BARBER STATES ---
  const [barbers, setBarbers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', specialty: '', experienceYears: '', price: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  // --- SCHEDULE STATES ---
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

  // --- DAILY OPERATIONS STATES ---
  const [dailyBookings, setDailyBookings] = useState([]);
  const [adminDate, setAdminDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);

  useEffect(() => {
    fetchBarbers();
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') fetchDailyBookings();
  }, [activeTab, adminDate]);

  // --- FETCHERS ---
  const fetchBarbers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/barbers');
      setBarbers(response.data);
    } catch (error) { toast.error('Gagal memuat daftar barber.'); }
  };

  const fetchDailyBookings = async () => {
    setIsLoadingDaily(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/admin/bookings?date=${adminDate}`);
      setDailyBookings(response.data);
    } catch (error) {
      toast.error('Gagal memuat jadwal operasional.');
    } finally {
      setIsLoadingDaily(false);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus, customerId) => {
    if (newStatus === 'No-Show' && !window.confirm('Tandai sebagai Tidak Hadir? Customer akan terkena penalti (Kredit -1).')) return;
    
    try {
      await axios.put('http://localhost:5000/api/admin/bookings/status', {
        bookingId, status: newStatus, customerId
      });
      toast.success(`Booking ditandai: ${newStatus}`);
      fetchDailyBookings(); 
    } catch (error) {
      toast.error('Gagal mengupdate status.');
    }
  };

  // --- ADD BARBER LOGIC (RESTORED FULLY) ---
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };
  
  const handleFileChange = (e) => { 
    e.preventDefault(); 
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]); 
  };
  
  const handleFile = (file) => { 
    setImageFile(file); 
    setImagePreview(URL.createObjectURL(file)); 
  };
  
  const handleAddBarber = async (e) => {
    e.preventDefault();
    if (!imageFile) return toast.error('Harap upload foto!');
    const submitData = new FormData();
    submitData.append('fullName', formData.fullName); submitData.append('specialty', formData.specialty);
    submitData.append('experienceYears', formData.experienceYears); submitData.append('price', formData.price);
    submitData.append('image', imageFile);
    try {
      await axios.post('http://localhost:5000/api/barbers', submitData, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success("Barber berhasil ditambahkan!"); 
      setIsModalOpen(false); 
      setFormData({ fullName: '', specialty: '', experienceYears: '', price: '' });
      setImageFile(null); setImagePreview(null);
      fetchBarbers();
    } catch (error) { toast.error('Gagal menambahkan barber!'); }
  };

  // --- SCHEDULE LOGIC ---
  const fetchSchedule = async (barber, date) => {
    setIsLoadingSchedule(true);
    try {
      const response = await axios.get(`http://localhost:5000/api/availability?barberId=${barber.id}&date=${date}`);
      setAvailableSlots(response.data);
    } catch (error) { toast.error('Gagal memuat jadwal.'); } 
    finally { setIsLoadingSchedule(false); }
  };

  const handleOpenSchedule = (barber) => {
    setSelectedBarber(barber); setIsScheduleModalOpen(true); fetchSchedule(barber, selectedDate);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-barber-bg font-sans text-barber-text pb-20 relative">
      <nav className="bg-barber-surface border-b border-barber-muted/20 px-6 py-4 sticky top-0 z-40 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-barber-accent font-serif italic tracking-wide">BarberHub</h1>
          <span className="hidden sm:inline-block bg-barber-accent/10 text-barber-accent text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Admin Console</span>
        </div>
        <button onClick={handleLogout} className="p-2 text-barber-muted hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-medium">
          <LogOut size={18} /><span className="hidden sm:inline">Keluar</span>
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        {/* TAB SWITCHER */}
        <div className="flex gap-4 mb-8 border-b border-barber-muted/20 pb-4">
          <button 
            onClick={() => setActiveTab('barbers')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'barbers' ? 'bg-barber-accent text-barber-bg' : 'bg-barber-surface text-barber-text hover:bg-barber-muted/10'}`}
          >
            Manajemen Barber
          </button>
          <button 
            onClick={() => setActiveTab('daily')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'daily' ? 'bg-barber-accent text-barber-bg' : 'bg-barber-surface text-barber-text hover:bg-barber-muted/10'}`}
          >
            Operasional Harian
          </button>
        </div>

        {/* TAB 1: MANAJEMEN BARBER */}
        {activeTab === 'barbers' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-barber-surface rounded-xl border border-barber-muted/20 overflow-hidden">
              <div className="p-6 border-b border-barber-muted/20 flex justify-between items-center bg-barber-surface">
                <h3 className="text-xl font-bold text-barber-text">Manajemen Barber</h3>
                <button onClick={() => setIsModalOpen(true)} className="bg-barber-accent text-barber-bg px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-opacity-90 transition-all active:scale-95">
                  <Plus size={18} /> Tambah Barber
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-barber-bg text-barber-muted text-sm uppercase tracking-wider border-b border-barber-muted/20">
                      <th className="p-4 font-semibold">Nama</th>
                      <th className="p-4 font-semibold">Spesialisasi</th>
                      <th className="p-4 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barbers.map((barber) => (
                      <tr key={barber.id} className="border-b border-barber-muted/10 hover:bg-barber-bg/50 transition-colors">
                        <td className="p-4 font-semibold text-barber-text flex items-center gap-3">
                          <img src={barber.image} alt={barber.name} className="w-10 h-10 rounded-full object-cover border border-barber-muted/30" />
                          {barber.name}
                        </td>
                        <td className="p-4 text-barber-text/70 text-sm">{barber.specialty}</td>
                        <td className="p-4 flex justify-end gap-3 text-barber-muted">
                          <button onClick={() => handleOpenSchedule(barber)} title="Cek Jadwal" className="hover:text-blue-400 bg-barber-bg p-2 rounded-md"><Calendar size={18} /></button>
                          <button title="Edit" className="hover:text-barber-accent bg-barber-bg p-2 rounded-md"><Edit size={18} /></button>
                          <button title="Hapus" className="hover:text-red-400 bg-barber-bg p-2 rounded-md"><Trash2 size={18} /></button>
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
        {activeTab === 'daily' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-serif text-barber-text">Jadwal Operasional</h2>
              <div className="bg-barber-surface border border-barber-muted/20 rounded-lg p-2">
                <input 
                  type="date" 
                  value={adminDate}
                  onChange={(e) => setAdminDate(e.target.value)}
                  className="bg-transparent text-barber-text outline-none font-semibold cursor-pointer"
                />
              </div>
            </div>

            {isLoadingDaily ? (
              <div className="text-center py-10 text-barber-accent animate-pulse">Memuat data operasional...</div>
            ) : dailyBookings.length === 0 ? (
              <div className="bg-barber-surface border border-barber-muted/20 rounded-xl p-10 text-center">
                <CalendarCheck size={48} className="mx-auto text-barber-muted mb-4 opacity-50" />
                <p className="text-barber-muted font-semibold">Tidak ada booking untuk tanggal ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {dailyBookings.map(booking => (
                  <div key={booking.id} className="bg-barber-surface border border-barber-muted/20 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-6 w-full sm:w-auto">
                      <div className="bg-barber-bg border border-barber-muted/30 p-3 rounded-lg text-center min-w-[5rem]">
                        <p className="text-barber-accent font-bold text-xl">{booking.start_time.substring(0, 5)}</p>
                        <p className="text-xs text-barber-muted">WIB</p>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-barber-text">{booking.customer_name}</h4>
                        <p className="text-sm text-barber-muted flex gap-2">
                          <span>Barber: <strong>{booking.barber_name}</strong></span> | 
                          <span className="text-green-400">WA: {booking.customer_phone}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      {booking.status === 'Upcoming' ? (
                        <>
                          <button 
                            onClick={() => handleStatusUpdate(booking.id, 'Completed', booking.customer_id)}
                            className="bg-green-500/10 text-green-400 border border-green-500/30 px-4 py-2 rounded-lg font-bold hover:bg-green-500 hover:text-white transition-all flex items-center gap-2"
                          >
                            <CheckCircle size={18} /> Hadir / Selesai
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(booking.id, 'No-Show', booking.customer_id)}
                            className="bg-red-500/10 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"
                          >
                            <AlertTriangle size={18} /> No-Show
                          </button>
                        </>
                      ) : (
                        <span className={`px-4 py-2 rounded-lg font-bold border ${
                          booking.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                          booking.status === 'No-Show' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          'bg-barber-bg text-barber-muted border-barber-muted/20'
                        }`}>
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
      </div>
      
      {/* --- RESTORED MODAL 1: ADD BARBER --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-barber-surface border border-barber-muted/20 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
            <div className="flex justify-between items-center p-6 border-b border-barber-muted/20">
              <h3 className="text-xl font-bold font-serif text-barber-text">Tambah Barber Baru</h3>
              <button onClick={() => {
                setIsModalOpen(false);
                setImagePreview(null);
                setImageFile(null);
              }} className="text-barber-muted hover:text-red-400 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddBarber} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">Nama Lengkap</label>
                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} required className="w-full px-4 py-3 rounded-lg bg-barber-bg border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none" placeholder="Cth: John Doe" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">Spesialisasi</label>
                <input type="text" name="specialty" value={formData.specialty} onChange={handleInputChange} required className="w-full px-4 py-3 rounded-lg bg-barber-bg border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none" placeholder="Cth: Classic Fades" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">Pengalaman (Tahun)</label>
                  <input type="number" name="experienceYears" value={formData.experienceYears} onChange={handleInputChange} required min="0" className="w-full px-4 py-3 rounded-lg bg-barber-bg border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none" placeholder="Cth: 5" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">Harga Layanan (Rp)</label>
                  <input type="number" name="price" value={formData.price} onChange={handleInputChange} required min="0" step="1000" className="w-full px-4 py-3 rounded-lg bg-barber-bg border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none" placeholder="Cth: 75000" />
                </div>
              </div>

              {/* DRAG AND DROP ZONE */}
              <div>
                <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">Foto Profile Barber</label>
                <div 
                  className={`relative w-full h-40 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${
                    dragActive ? 'border-barber-accent bg-barber-accent/10' : 'border-barber-muted/40 hover:border-barber-accent/50 bg-barber-bg'
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
                      <p className="text-sm font-semibold text-barber-text/80">Drag & Drop foto ke sini</p>
                      <p className="text-xs mt-1">atau klik untuk mencari file</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-lg font-semibold text-barber-text hover:bg-barber-muted/10 transition-colors">Batal</button>
                <button type="submit" className="bg-barber-accent text-barber-bg px-6 py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all active:scale-95">Simpan Barber</button>
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
              <h3 className="text-xl font-bold font-serif text-barber-text">Jadwal {selectedBarber.name}</h3>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-barber-muted hover:text-red-400 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6">
              <input type="date" value={selectedDate} onChange={(e) => {setSelectedDate(e.target.value); fetchSchedule(selectedBarber, e.target.value);}} className="w-full px-4 py-3 rounded-lg bg-barber-bg border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none mb-6" min={new Date().toISOString().split('T')[0]} />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {['09:00:00', '10:00:00', '11:00:00', '12:00:00', '13:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00', '19:00:00'].map((timeStr) => {
                  const isAvailable = availableSlots.includes(timeStr);
                  return (
                    <div key={timeStr} className={`py-2 px-1 text-center rounded-lg text-sm font-semibold border ${isAvailable ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400 line-through opacity-70'}`}>
                      {timeStr.substring(0, 5)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}