import React, { useState } from 'react';
import { X, User, Mail, LogIn, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { authService } from '../services/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userEmail.trim()) {
      setError('Please enter your Google email address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await authService.loginWithGoogle(userEmail.trim(), userName.trim() || undefined);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickGooglePrompt = async () => {
    try {
      setLoading(true);
      setError(null);
      await authService.loginWithGoogle();
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errorObj = err as Error;
      // If popup was closed or not configured, guide user to enter email
      setError(errorObj.message || 'Please enter your Google email below to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl glass-panel border border-white/10 p-6 sm:p-8 shadow-2xl shadow-stranger-purple/20">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 p-[2px] shadow-lg shadow-stranger-purple/30">
            <div className="w-full h-full bg-dark-900 rounded-[14px] flex items-center justify-center">
              <img src="/logo.svg" alt="StrangerVerse" className="w-8 h-8" />
            </div>
          </div>
          <h3 className="font-display font-bold text-2xl text-white tracking-wide">
            Sign In to STRANGERVERSE
          </h3>
          <p className="text-xs text-slate-400">
            Enter your Google details. Every new user receives the <span className="text-cyan-400 font-semibold">NORMAL USER</span> role.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Real Firebase Google Login Button */}
        <button
          type="button"
          disabled={loading}
          onClick={handleQuickGooglePrompt}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl font-semibold text-sm bg-white hover:bg-slate-100 text-slate-900 shadow-xl transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 mb-5"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {loading ? 'Authenticating...' : 'Sign in with Google'}
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-dark-900 px-3 text-slate-400 font-semibold tracking-wider">
              Or sign in with your details
            </span>
          </div>
        </div>

        {/* User Account Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Your Display Name:
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. Karthik / Ananya"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">
              Your Google Email:
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="e.g. user@gmail.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-dark-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !userEmail.trim()}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-stranger-cyan via-stranger-blue to-stranger-purple text-white shadow-lg shadow-stranger-blue/20 hover:opacity-95 transition-all disabled:opacity-40"
          >
            <LogIn className="w-4 h-4" />
            <span>Continue as Verified User</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Role Enforcement Notice */}
        <div className="mt-5 p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>
            Every user is assigned <strong className="text-white">NORMAL USER</strong> by default with a unique personal ID. Administrative privileges are permanently locked to <strong className="text-amber-400">preethivejr@gmail.com</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};
