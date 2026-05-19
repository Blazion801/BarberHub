import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '', whatsapp: '', email: '', password: '', confirmPassword: ''
  });
  const [error, setError] = useState('');
  
  // UX FIX: Added state to toggle password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'whatsapp' && value !== '' && !/^\d+$/.test(value)) return; 
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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

    try {
      const response = await axios.post('http://localhost:5000/api/register', {
        name: formData.fullName, 
        whatsapp: formData.whatsapp,
        email: formData.email,
        password: formData.password
      });

      if (response.status === 201) {
        toast.success('Akun berhasil dibuat! Silakan masuk.');
        
        setTimeout(() => {
          navigate('/login');
        }, 1500); 
      }
    } catch (err) {
      console.error('Registration API Error:', err);
      toast.error(err.response?.data?.message || 'Gagal terhubung ke server backend.');
      setError(err.response?.data?.message || 'Gagal terhubung ke server backend.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-barber-bg px-6 font-sans">
      <div className="w-full max-w-sm">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-barber-accent mb-3 tracking-wide font-serif italic">
            BarberHub
          </h1>
          <p className="text-barber-text/80 text-sm">
            Mulai Perjalanan Gaya Anda
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form id="register-form" onSubmit={handleSubmit} className="space-y-5">
          
          <div>
            <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">Nama Lengkap</label>
            <input
              type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="John Doe" required
              className="w-full px-4 py-4 rounded-lg bg-barber-surface text-barber-text placeholder-barber-muted border border-barber-muted/30 focus:border-barber-accent focus:outline-none focus:ring-1 focus:ring-barber-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">Nomor WhatsApp</label>
            <input
              type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleChange} placeholder="081234567890" required
              className="w-full px-4 py-4 rounded-lg bg-barber-surface text-barber-text placeholder-barber-muted border border-barber-muted/30 focus:border-barber-accent focus:outline-none focus:ring-1 focus:ring-barber-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">Email</label>
            <input
              type="email" name="email" value={formData.email} onChange={handleChange} placeholder="nama@email.com" required
              className="w-full px-4 py-4 rounded-lg bg-barber-surface text-barber-text placeholder-barber-muted border border-barber-muted/30 focus:border-barber-accent focus:outline-none focus:ring-1 focus:ring-barber-accent transition-all"
            />
          </div>

          {/* Password Field with Eye Icon */}
          <div>
            <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} 
                name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required
                className="w-full px-4 py-4 rounded-lg bg-barber-surface text-barber-text placeholder-barber-muted border border-barber-muted/30 focus:border-barber-accent focus:outline-none focus:ring-1 focus:ring-barber-accent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-barber-muted hover:text-barber-text transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field with Eye Icon */}
          <div>
            <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">Konfirmasi Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"} 
                name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required
                className="w-full px-4 py-4 rounded-lg bg-barber-surface text-barber-text placeholder-barber-muted border border-barber-muted/30 focus:border-barber-accent focus:outline-none focus:ring-1 focus:ring-barber-accent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-barber-muted hover:text-barber-text transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-barber-accent text-barber-bg py-4 rounded-lg font-bold text-base hover:bg-opacity-90 transition-all active:scale-[0.98]"
            >
              Daftar Sekarang
            </button>
          </div>
        </form>

        <div className="mt-10 text-center text-sm text-barber-text/70">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-barber-accent font-semibold hover:underline">
            Masuk
          </Link>
        </div>
        
      </div>
    </div>
  );
}