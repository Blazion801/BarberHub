import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Call the AuthContext login function
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      toast.success('Login successful!');
      
      if (result.role === 'Admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      toast.error(result.message);
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
            Welcome back, please sign in
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div>
            <label className="block text-xs font-semibold text-barber-text uppercase mb-2 tracking-wider">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="name@email.com"
              required
              className="w-full px-4 py-4 rounded-lg bg-barber-surface text-barber-text placeholder-barber-muted border border-barber-muted/30 focus:border-barber-accent focus:outline-none focus:ring-1 focus:ring-barber-accent transition-all"
            />
          </div>

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
            
            <div className="mt-4 text-right">
              <Link to="/forgot-password" className="text-sm text-barber-text/80 hover:text-barber-accent transition-colors">
                Forgot Password?
              </Link>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-barber-accent text-barber-bg py-4 rounded-lg font-bold text-base hover:bg-opacity-90 transition-all active:scale-[0.98]"
            >
              Sign In
            </button>
          </div>
        </form>

        <div className="mt-10 text-center text-sm text-barber-text/70">
          Don't have an account?{' '}
          <Link to="/register" className="text-barber-accent font-semibold hover:underline">
            Register here
          </Link>
        </div>
        
      </div>
    </div>
  );
}