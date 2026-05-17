import { LogOut, Calendar, Clock, Scissors, Star, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Berhasil keluar.');
    navigate('/login');
  };

  // Mock data for barbers - later we will fetch this from your backend
  const barbers = [
    { id: 1, name: 'Alex Thorne', specialty: 'Classic Fades & Beard Trims', rating: 4.9, image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&q=80&w=400' },
    { id: 2, name: 'Marcus Chen', specialty: 'Modern Scissor Cuts', rating: 4.8, image: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&q=80&w=400' },
  ];

  return (
    <div className="min-h-screen bg-barber-bg font-sans text-barber-text pb-20">
      
      {/* Top Navigation Bar */}
      <nav className="bg-barber-surface border-b border-barber-muted/20 px-6 py-4 sticky top-0 z-50 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-barber-accent font-serif italic tracking-wide">
            BarberHub
          </h1>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-barber-muted hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 mt-8">
        
        {/* Welcome Section & Life System */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-bold font-serif text-barber-text mb-2">
              Selamat datang, <span className="text-barber-accent">{user?.name?.split(' ')[0] || 'Guest'}</span>.
            </h2>
            <p className="text-barber-text/70">Siap untuk menyegarkan gaya Anda hari ini?</p>
          </div>

          {/* SRS REQ-4.1: Life Count Status Card */}
          <div className="bg-barber-surface border border-barber-accent/30 rounded-xl p-4 flex items-center gap-4 shadow-lg min-w-[250px]">
            <div className="bg-barber-accent/10 p-3 rounded-full text-barber-accent">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs text-barber-text/70 uppercase tracking-wider font-semibold mb-1">Status Akun</p>
              <p className="text-lg font-bold text-barber-text">
                {user?.life_count} <span className="text-sm font-normal text-barber-text/70">Kesempatan Batal</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Calendar, label: 'Booking Baru', active: true },
            { icon: Clock, label: 'Riwayat', active: false },
            { icon: Scissors, label: 'Layanan', active: false },
          ].map((item, idx) => (
            <button 
              key={idx}
              // Added active:scale-95 for that tactile "click" feel
              className={`p-4 rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-300 active:scale-95 ${
                item.active 
                  // Active state: Added a hover lift (-translate-y-1) and an intensifying shadow glow
                  ? 'bg-barber-accent text-barber-bg shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_6px_25px_rgba(212,175,55,0.5)] hover:-translate-y-1' 
                  // Inactive state: Border matches surface initially, then lights up gold on hover with a lift
                  : 'bg-barber-surface text-barber-text border border-barber-surface hover:border-barber-accent/80 hover:text-barber-accent hover:-translate-y-1 hover:shadow-lg'
              }`}
            >
              <item.icon size={24} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Barber Selection List */}
        <div>
          <div className="flex justify-between items-end mb-6">
            <h3 className="text-2xl font-serif font-bold text-barber-text">Pilih Barber Anda</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {barbers.map((barber) => (
              <div key={barber.id} className="bg-barber-surface rounded-2xl overflow-hidden border border-barber-muted/20 hover:border-barber-accent/50 transition-all group flex flex-col sm:flex-row">
                <div className="h-48 sm:h-auto sm:w-2/5 overflow-hidden">
                  <img 
                    src={barber.image} 
                    alt={barber.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xl font-bold text-barber-text">{barber.name}</h4>
                      <div className="flex items-center gap-1 text-barber-accent text-sm font-semibold bg-barber-bg px-2 py-1 rounded-md">
                        <Star size={14} fill="currentColor" />
                        {barber.rating}
                      </div>
                    </div>
                    <p className="text-barber-text/70 text-sm mb-6">{barber.specialty}</p>
                  </div>
                  <button className="w-full bg-transparent border border-barber-accent text-barber-accent py-2.5 rounded-lg font-semibold hover:bg-barber-accent hover:text-barber-bg transition-colors">
                    Booking Jadwal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}