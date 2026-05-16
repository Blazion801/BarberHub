import { useState } from 'react';
import { ArrowLeft, User, Phone, Mail, Lock, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    whatsapp: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'whatsapp' && value !== '' && !/^\d+$/.test(value)) return; 
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.whatsapp.length < 10) {
      setError('Nomor WhatsApp minimal 10 angka.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    console.log('Submitting Registration:', formData);
  };

  return (
    <div className="min-h-screen flex flex-col bg-barber-bg font-sans">
      
      {/* Top Navigation */}
      <div className="px-6 py-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-barber-gold hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-barber-light text-lg font-semibold">Buat Akun Baru</h2>
      </div>

      {/* Main Content Area */}
      <div className="px-6 flex-1">
        
        {/* Header Text */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-barber-gold leading-tight mb-2">
            Mulai Perjalanan<br />Gaya Anda.
          </h1>
          <p className="text-barber-text text-sm pr-4">
            Isi data dirimu untuk mulai booking layanan eksklusif kami.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 text-destructive border border-red-900/50 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form Fields */}
        <form id="register-form" onSubmit={handleSubmit} className="space-y-4 pb-24">
          
          <div>
            <label className="block text-xs font-medium text-barber-text mb-2">Nama Lengkap</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={18} className="text-barber-text/50" />
              </div>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="John Doe"
                required
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-barber-input text-barber-light placeholder-barber-text/30 border border-transparent focus:border-barber-muted focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-barber-text mb-2">Nomor WhatsApp</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone size={18} className="text-barber-text/50" />
              </div>
              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="081234567890"
                required
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-barber-input text-barber-light placeholder-barber-text/30 border border-transparent focus:border-barber-muted focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-barber-text mb-2">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail size={18} className="text-barber-text/50" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="johndoe@example.com"
                required
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-barber-input text-barber-light placeholder-barber-text/30 border border-transparent focus:border-barber-muted focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-barber-text mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-barber-text/50" />
              </div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-barber-input text-barber-light placeholder-barber-text/30 border border-transparent focus:border-barber-muted focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-barber-text mb-2">Konfirmasi Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-barber-text/50" />
              </div>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-barber-input text-barber-light placeholder-barber-text/30 border border-transparent focus:border-barber-muted focus:outline-none transition-all"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Bottom Container */}
      <div className="bg-barber-surface mt-auto rounded-t-[32px] px-6 py-8">
        <button
          form="register-form"
          type="submit"
          className="w-full bg-barber-gold text-barber-bg py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-opacity-90 transition-all active:scale-[0.98]"
        >
          <UserPlus size={20} />
          Daftar Sekarang
        </button>

        <div className="mt-6 text-center text-sm text-barber-text">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-barber-gold font-semibold hover:underline">
            Masuk
          </Link>
        </div>
      </div>

    </div>
  );
}