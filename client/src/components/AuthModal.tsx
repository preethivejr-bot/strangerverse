import React, { useState } from 'react';
import { X, ShieldAlert, Sparkles, User, Mail, LogIn, ArrowRight } from 'lucide-react';
import { authService } from '../services/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');

  if (!isOpen) return null;

  const handleGoogleLogin = async (email?: string, name?: string) => {
    try {
      setLoading(true);
      setError(null);
      await authService.loginWithGoogle(email, name);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Authentication failed. Please try again.');
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
            Connect securely with your Google identity. All new members receive <span className="text-cyan-400 font-semibold">NORMAL USER</span> role.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Real Firebase Google Login Button */}
        <button
          disabled={loading}
          onClick={() => handleGoogleLogin()}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl font-semibold text-sm bg-white hover:bg-slate-100 text-slate-900 shadow-xl transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
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
          Continue with Google Account
        </button>

        {/* Multi-Account Selector for Testing */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-dark-900 px-3 text-slate-400 font-semibold tracking-wider">
              Quick Multi-Account Testing
            </span>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          {/* Configured Owner Shortcut */}
          <button
            onClick={() => handleGoogleLogin('preethivejr@gmail.com', 'Preethive (Owner)')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-xs font-bold text-amber-300">
                  Preethive (Super Manager / Owner)
                </div>
                <div className="text-[11px] text-amber-200/70 font-mono">
                  preethivejr@gmail.com
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </button>

          {/* Test Normal User 1 */}
          <button
            onClick={() => handleGoogleLogin('chennai_stranger@gmail.com', 'Karthik (Chennai)')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <User className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Karthik (Normal User)
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  chennai_stranger@gmail.com
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Test Normal User 2 */}
          <button
            onClick={() => handleGoogleLogin('madurai_gamer@gmail.com', 'Ananya (Madurai)')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <User className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  Ananya (Normal User)
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  madurai_gamer@gmail.com
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Custom Google Email Input */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <label className="block text-[11px] text-slate-400 font-medium">
            Or test with any custom Google email:
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="e.g. yourname@gmail.com"
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-dark-950 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
            <button
              disabled={!customEmail.trim()}
              onClick={() => handleGoogleLogin(customEmail, customName || undefined)}
              className="px-4 py-2 rounded-xl bg-stranger-purple hover:bg-purple-600 text-white font-semibold text-xs disabled:opacity-40 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <p className="mt-5 text-[11px] text-slate-500 text-center">
          🔒 Secure Firebase session token validation. Protected by immutable Level 1 Owner governance.
        </p>
      </div>
    </div>
  );
};
