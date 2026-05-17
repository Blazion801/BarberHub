import { useState } from 'react';
import { ArrowLeft, User, Phone, Mail, Lock, UserPlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '', whatsapp: '', email: '', password: '', confirmPassword: ''
  });
  const [error, setError] = useState('');

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
      // setError(err.response?.data?.message || 'Gagal terhubung ke server backend.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-barber-bg font-sans">
      
      {/* Top Navigation */}
      <div className="px-6 py-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-barber-accent hover:text-barber-text transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-barber-text text-lg font-semibold">Buat Akun Baru</h2>
      </div>

      <div className="px-6 flex-1">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-barber-accent leading-tight mb-2 font-serif">
            Mulai Perjalanan<br />Gaya Anda.
          </h1>
          <p className="text-barber-text/80 text-sm pr-4 leading-relaxed">
            Isi data dirimu untuk mulai booking layanan eksklusif kami.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form id="register-form" onSubmit={handleSubmit} className="space-y-4 pb-24">
          {[
            { label: 'Nama Lengkap', name: 'fullName', type: 'text', icon: User, placeholder: 'John Doe' },
            { label: 'Nomor WhatsApp', name: 'whatsapp', type: 'tel', icon: Phone, placeholder: '081234567890' },
            { label: 'Email', name: 'email', type: 'email', icon: Mail, placeholder: 'johndoe@example.com' },
            { label: 'Password', name: 'password', type: 'password', icon: Lock, placeholder: '••••••••' },
            { label: 'Konfirmasi Password', name: 'confirmPassword', type: 'password', icon: Lock, placeholder: '••••••••' }
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-xs font-semibold text-barber-text mb-2 tracking-wider uppercase">{field.label}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <field.icon size={18} className="text-barber-muted" />
                </div>
                <input
                  type={field.type}
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  required
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-barber-surface text-barber-text placeholder-barber-muted border border-barber-muted/30 focus:border-barber-accent focus:outline-none focus:ring-1 focus:ring-barber-accent transition-all"
                />
              </div>
            </div>
          ))}
        </form>
      </div>

      <div className="bg-barber-surface mt-auto rounded-t-[32px] px-6 py-8 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-barber-muted/20">
        <button
          form="register-form"
          type="submit"
          className="w-full bg-barber-accent text-barber-bg py-4 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-opacity-90 transition-all active:scale-[0.98]"
        >
          <UserPlus size={20} />
          Daftar Sekarang
        </button>

        <div className="mt-6 text-center text-sm text-barber-text/80">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-barber-accent font-semibold hover:underline">
            Masuk
          </Link>
        </div>
      </div>
    </div>
  );
}