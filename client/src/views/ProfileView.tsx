import React from 'react';
import { 
  User as UserIcon, 
  ShieldCheck, 
  ShieldAlert, 
  Mail, 
  Calendar, 
  Fingerprint, 
  CheckCircle2, 
  Award,
  BookOpen
} from 'lucide-react';
import { User } from '../types';

interface ProfileViewProps {
  user: User | null;
  onOpenAuth: () => void;
  onNavigate: (tab: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onOpenAuth, onNavigate }) => {
  if (!user) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-3xl glass-panel border border-white/10 text-center space-y-4">
        <UserIcon className="w-14 h-14 text-cyan-400 mx-auto" />
        <h3 className="font-display font-bold text-xl text-white">Guest Visitor</h3>
        <p className="text-xs text-slate-400">
          Sign in with your Google account to unlock voice chat, district junctions, and multiplayer games.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-stranger-cyan via-stranger-blue to-stranger-purple text-white shadow-lg"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  const isOwner = user.role === 'OWNER';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      
      {/* Profile Header Card */}
      <div className="relative p-8 rounded-3xl glass-panel border border-white/10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-purple-500/15 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          
          <img
            src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName}`}
            alt={user.displayName}
            className="w-24 h-24 rounded-3xl border-2 border-stranger-purple object-cover shadow-2xl"
          />

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                {user.displayName}
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                isOwner ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                user.role === 'MANAGER' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                user.role === 'MODERATOR' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                'bg-white/10 text-slate-300 border border-white/10'
              }`}>
                {user.role}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {user.email}
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                UID: {user.id.substring(0, 14)}...
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                Registered: {user.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : 'Active'}
              </span>
            </div>
          </div>

          {isOwner && (
            <button
              onClick={() => onNavigate('owner')}
              className="px-5 py-2.5 rounded-2xl font-bold text-xs bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
            >
              Owner Control Center
            </button>
          )}
        </div>
      </div>

      {/* Community Guidelines & Safety Notice */}
      <div className="rounded-3xl glass-panel border border-white/10 p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">STRANGERVERSE Community Guidelines</h3>
            <p className="text-xs text-slate-400">Rules for safe, respectful, and enjoyable stranger communication</p>
          </div>
        </div>

        <ul className="space-y-3 pt-2 text-xs text-slate-300 leading-relaxed">
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span><strong>Respect Everyone:</strong> Treat all strangers and local district room participants with dignity. No harassment, hate speech, or abuse.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span><strong>Audio Courtesy:</strong> Keep background noise minimal. Do not scream, play loud music, or disturb voice conversations.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span><strong>Automatic Room Moderation:</strong> Staying continuously in a junction for 10 minutes qualifies you for automated promotion to Room Moderator. Keep the room safe!</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span><strong>Fair Play in Games:</strong> Play UNO and Ludo with sporting spirit. Do not abandon matches mid-game.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span><strong>Permanent Owner Protection:</strong> The platform creator is safeguarded by cryptographic Level 1 immutable authority. No user can escalate their own privileges.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
