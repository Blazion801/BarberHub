import { Users, CalendarCheck, TrendingUp, LogOut, Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Admin berhasil keluar.');
    navigate('/login');
  };

  // Mock data for barbers - later we will fetch this from your backend
  const barbers = [
    { id: 1, name: 'Alex Thorne', specialty: 'Classic Fades', rating: 4.9, status: 'Active' },
    { id: 2, name: 'Marcus Chen', specialty: 'Modern Scissor Cuts', rating: 4.8, status: 'Active' },
  ];

  return (
    <div className="min-h-screen bg-barber-bg font-sans text-barber-text pb-20">
      
      {/* Top Navigation */}
      <nav className="bg-barber-surface border-b border-barber-muted/20 px-6 py-4 sticky top-0 z-50 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-barber-accent font-serif italic tracking-wide">
            BarberHub
          </h1>
          <span className="hidden sm:inline-block bg-barber-accent/10 text-barber-accent text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Admin Console
          </span>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-barber-muted hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        <div className="mb-10">
          <h2 className="text-3xl font-bold font-serif text-barber-text mb-2">
            Overview Sistem
          </h2>
          <p className="text-barber-text/70">Pantau performa BarberHub hari ini.</p>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Total Booking Hari Ini', value: '24', icon: CalendarCheck },
            { label: 'Barber Aktif', value: '8', icon: Users },
            { label: 'Pendapatan Estimasi', value: 'Rp 1.2M', icon: TrendingUp },
          ].map((stat, idx) => (
            <div key={idx} className="bg-barber-surface border border-barber-muted/20 rounded-xl p-6 flex items-start justify-between hover:border-barber-accent/30 transition-colors">
              <div>
                <p className="text-sm font-semibold text-barber-muted mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-barber-text">{stat.value}</p>
              </div>
              <div className="bg-barber-bg p-3 rounded-lg text-barber-accent">
                <stat.icon size={24} />
              </div>
            </div>
          ))}
        </div>

        {/* Barber Management Table */}
        <div className="bg-barber-surface rounded-xl border border-barber-muted/20 overflow-hidden">
          <div className="p-6 border-b border-barber-muted/20 flex justify-between items-center bg-barber-surface">
            <h3 className="text-xl font-bold text-barber-text">Manajemen Barber</h3>
            <button className="bg-barber-accent text-barber-bg px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-opacity-90 transition-all active:scale-95">
              <Plus size={18} />
              Tambah Barber
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-barber-bg text-barber-muted text-sm uppercase tracking-wider border-b border-barber-muted/20">
                  <th className="p-4 font-semibold">Nama</th>
                  <th className="p-4 font-semibold">Spesialisasi</th>
                  <th className="p-4 font-semibold">Rating</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {barbers.map((barber) => (
                  <tr key={barber.id} className="border-b border-barber-muted/10 hover:bg-barber-bg/50 transition-colors">
                    <td className="p-4 font-semibold text-barber-text">{barber.name}</td>
                    <td className="p-4 text-barber-text/70">{barber.specialty}</td>
                    <td className="p-4 text-barber-text">{barber.rating} ⭐</td>
                    <td className="p-4">
                      <span className="bg-green-500/10 text-green-400 text-xs font-bold px-2 py-1 rounded">
                        {barber.status}
                      </span>
                    </td>
                    <td className="p-4 flex justify-end gap-3 text-barber-muted">
                      <button className="hover:text-barber-accent transition-colors">
                        <Edit size={18} />
                      </button>
                      <button className="hover:text-red-400 transition-colors">
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
    </div>
  );
}