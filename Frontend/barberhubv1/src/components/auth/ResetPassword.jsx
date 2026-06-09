import { useState } from "react";
import { Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters long.");
    if (newPassword !== confirmPassword) return toast.error("Password confirmation does not match!");

    setIsSubmitting(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const response = await axios.post(`${API_URL}/api/reset-password`, {
        token,
        newPassword
      });
      
      toast.success(response.data.message || "Password successfully updated!");
      setIsSuccess(true);
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => navigate("/login"), 3000);
      
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid or expired token.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Block rendering if no token is found in the URL
  if (!token) {
    return (
      <div className="min-h-screen bg-barber-bg flex items-center justify-center p-6">
        <div className="bg-barber-surface border border-red-500/20 p-8 rounded-3xl max-w-md text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h2>
          <p className="text-barber-muted mb-6">The password reset link is invalid or not found.</p>
          <Link to="/login" className="bg-barber-bg px-6 py-3 rounded-xl border border-barber-muted/30 hover:border-barber-accent transition-colors font-bold inline-block">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-barber-bg font-sans text-barber-text flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-barber-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="bg-barber-surface border border-barber-muted/20 rounded-3xl p-8 sm:p-10 w-full max-w-md shadow-2xl relative z-10 animate-in fade-in zoom-in duration-300">
        
        {isSuccess ? (
          <div className="text-center py-6">
            <div className="bg-green-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold font-serif mb-3 text-barber-text">Password Updated!</h2>
            <p className="text-barber-muted text-sm mb-8">You can now use your new password to log in to your account. Redirecting...</p>
            <Link to="/login" className="w-full inline-block bg-barber-accent text-barber-bg py-3.5 rounded-xl font-bold hover:bg-opacity-90 transition-all">
              Login Now
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-barber-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock size={28} className="text-barber-accent" />
            </div>

            <h2 className="text-3xl font-bold font-serif text-center mb-2">Create New Password</h2>
            <p className="text-barber-muted text-center text-sm mb-8">
              Make sure your new password is strong and has not been used before.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-barber-muted uppercase mb-2 tracking-wider ml-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-barber-muted" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-barber-bg border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none font-semibold transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-barber-muted uppercase mb-2 tracking-wider ml-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <CheckCircle2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-barber-muted" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm New Password"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-barber-bg border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none font-semibold transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-barber-accent text-barber-bg py-3.5 rounded-xl font-bold hover:bg-opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {isSubmitting ? "Saving..." : "Save New Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
