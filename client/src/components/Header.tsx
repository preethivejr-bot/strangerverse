import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  MessageSquare, 
  MapPin, 
  Gamepad2, 
  User as UserIcon, 
  ShieldCheck, 
  ShieldAlert, 
  LogOut, 
  LogIn, 
  Menu, 
  X,
  Users
} from 'lucide-react';
import { User, Role } from '../types';
import { socket } from '../services/socket';

interface HeaderProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number>(1);

  useEffect(() => {
    socket.on('users:count', (count: number) => {
      setOnlineCount(Math.max(1, count));
    });

    return () => {
      socket.off('users:count');
    };
  }, []);

  const getRoleBadge = (role?: Role) => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/20">
            <ShieldAlert className="w-3 h-3" />
            OWNER (L1)
          </span>
        );
      case 'MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
            <ShieldCheck className="w-3 h-3" />
            MANAGER
          </span>
        );
      case 'MODERATOR':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
            <ShieldCheck className="w-3 h-3" />
            MODERATOR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            NORMAL USER
          </span>
        );
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Radio },
    { id: 'voice', label: 'Voice Chat', icon: Radio },
    { id: 'text', label: 'Text Chat', icon: MessageSquare },
    { id: 'junctions', label: 'Junctions', icon: MapPin },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  const isOwnerOrManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-dark-950/80 border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Branding */}
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3.5 cursor-pointer group"
          >
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-stranger-cyan via-stranger-purple to-stranger-pink p-[2px] shadow-lg shadow-stranger-purple/25 transition-transform group-hover:scale-105">
              <div className="w-full h-full bg-dark-900 rounded-[10px] flex items-center justify-center overflow-hidden">
                <img src="/logo.svg" alt="StrangerVerse Logo" className="w-7 h-7 object-contain" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-xl sm:text-2xl tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-500">
                  STRANGERVERSE
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <Users className="w-3 h-3" />
                  {onlineCount} Online
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium tracking-tight hidden sm:block">
                Meet Strangers. Connect Locally. Play Together.
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-stranger-purple/20 to-stranger-blue/20 text-white border border-stranger-purple/40 shadow-sm shadow-stranger-purple/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}

            {/* Owner Control Center Tab */}
            {isOwnerOrManager && (
              <button
                onClick={() => setActiveTab('owner')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'owner'
                    ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Control Center
              </button>
            )}
          </nav>

          {/* User Auth & Profile Pill */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-2xl glass-panel border border-white/10">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`}
                  alt={user.displayName}
                  className="w-9 h-9 rounded-xl object-cover border border-stranger-purple/40 shadow"
                />
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-100 max-w-[120px] truncate">
                      {user.displayName}
                    </span>
                    {getRoleBadge(user.role)}
                  </div>
                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Logout"
                  className="p-2 ml-1 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-stranger-cyan via-stranger-blue to-stranger-purple text-white shadow-lg shadow-stranger-blue/25 hover:opacity-95 transition-all hover:scale-[1.02] active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                Google Login
              </button>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl glass-panel text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-white/10 bg-dark-900/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-2">
          {user && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 mb-3 border border-white/10">
              <div className="flex items-center gap-3">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`}
                  alt={user.displayName}
                  className="w-10 h-10 rounded-xl"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{user.displayName}</span>
                    {getRoleBadge(user.role)}
                  </div>
                  <span className="text-xs text-slate-400">{user.email}</span>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  isActive
                    ? 'bg-stranger-purple/20 text-cyan-300 border border-stranger-purple/40'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}

          {isOwnerOrManager && (
            <button
              onClick={() => {
                setActiveTab('owner');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30"
            >
              <ShieldAlert className="w-5 h-5" />
              Owner Control Center
            </button>
          )}

          {!user && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth();
              }}
              className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-gradient-to-r from-stranger-cyan via-stranger-blue to-stranger-purple text-white shadow-lg"
            >
              <LogIn className="w-5 h-5" />
              Sign in with Google
            </button>
          )}
        </div>
      )}
    </header>
  );
};
