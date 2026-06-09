import { useState } from "react";
import { Mail, ArrowLeft, Key } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Silakan masukkan email Anda.");

    setIsSubmitting(true);
    try {
      const response = await axios.post("http://localhost:5000/api/forgot-password", { email });
      toast.success(response.data.message || "Tautan reset telah dikirim!");
      setIsSent(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal memproses permintaan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-barber-bg font-sans text-barber-text flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow effects matching your theme */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-barber-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-barber-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

      <div className="bg-barber-surface border border-barber-muted/20 rounded-3xl p-8 sm:p-10 w-full max-w-md shadow-2xl relative z-10 animate-in fade-in zoom-in duration-300">
        <div className="bg-barber-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <Key size={28} className="text-barber-accent" />
        </div>

        <h2 className="text-3xl font-bold font-serif text-center mb-2">Forgot Password?</h2>
        <p className="text-barber-muted text-center text-sm mb-8">
          Enter your registered email and we will send you instructions to reset your password.
        </p>

        {!isSent ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-barber-muted uppercase mb-2 tracking-wider ml-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-barber-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-barber-bg border border-barber-muted/30 text-barber-text focus:border-barber-accent focus:outline-none font-semibold transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-barber-accent text-barber-bg py-3.5 rounded-xl font-bold hover:bg-opacity-90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <div className="bg-barber-bg border border-barber-muted/20 p-5 rounded-xl text-center mb-6">
            <p className="text-sm font-semibold text-barber-accent">
              Please check your email inbox (including the spam folder) for the reset link.
            </p>
          </div>
        )}

        <div className="mt-8 text-center border-t border-barber-muted/10 pt-6">
          <Link to="/login" className="text-sm font-bold text-barber-muted hover:text-barber-text transition-colors flex items-center justify-center gap-2 inline-flex">
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}