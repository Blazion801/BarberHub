import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitting Login:', formData);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-barber-bg px-6 font-sans">
      <div className="w-full max-w-sm">
        
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-barber-gold mb-3 tracking-wide">
            BarberHub
          </h1>
          <p className="text-barber-text text-sm">
            Selamat datang kembali, silakan masuk
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="nama@email.com"
              required
              className="w-full px-4 py-4 rounded-lg bg-barber-surface text-barber-text placeholder-barber-text/50 border border-transparent focus:border-barber-muted/50 focus:outline-none focus:ring-1 focus:ring-barber-gold transition-all"
            />
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full px-4 py-4 rounded-lg bg-barber-surface text-barber-text placeholder-barber-text/50 border border-transparent focus:border-barber-muted/50 focus:outline-none focus:ring-1 focus:ring-barber-gold transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-barber-text/70 hover:text-barber-text transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            {/* Forgot Password Link */}
            <div className="mt-4 text-right">
              <Link to="/forgot-password" className="text-sm text-barber-text hover:text-barber-gold transition-colors">
                Lupa Password?
              </Link>
            </div>
          </div>

          {/* Spacer to match Figma layout */}
          <div className="pt-4">
            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-barber-gold text-barber-bg py-4 rounded-lg font-bold text-base hover:bg-opacity-90 transition-all active:scale-[0.98]"
            >
              Masuk
            </button>
          </div>
        </form>

        {/* Footer Link */}
        <div className="mt-10 text-center text-sm text-barber-text/70">
          Belum punya akun?{' '}
          <Link to="/register" className="text-barber-gold font-semibold hover:underline">
            Daftar di sini
          </Link>
        </div>
        
      </div>
    </div>
  );
}