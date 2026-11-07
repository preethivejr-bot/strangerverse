import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Users, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Flame, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User, JunctionSummary } from '../types';
import { socket } from '../services/socket';
import { DEFAULT_TAMIL_NADU_JUNCTIONS } from '../constants';
import { SERVER_URL } from '../services/config';

interface JunctionsViewProps {
  user: User | null;
  onOpenAuth: () => void;
  onJoinJunction: (districtId: string) => void;
}

export const JunctionsView: React.FC<JunctionsViewProps> = ({
  user,
  onOpenAuth,
  onJoinJunction
}) => {
  // Always initialize with all 10 Tamil Nadu districts so cards are immediately visible!
  const [junctions, setJunctions] = useState<JunctionSummary[]>(DEFAULT_TAMIL_NADU_JUNCTIONS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // 1. Immediate REST API fetch so data loads in milliseconds
    fetch(`${SERVER_URL}/api/junctions`)
      .then(res => res.json())
      .then((data: JunctionSummary[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setJunctions(data);
        }
      })
      .catch(err => console.warn('Fetch junctions error:', err));

    // 2. Real-time WebSocket synchronization
    const handleJunctionsUpdate = (data: JunctionSummary[]) => {
      if (Array.isArray(data) && data.length > 0) {
        setJunctions(data);
      }
    };

    socket.on('junctions:updated', handleJunctionsUpdate);

    // Request fresh state via socket
    socket.emit('junctions:get-all');

    // Also re-request when socket connects or reconnects
    socket.on('connect', () => {
      socket.emit('junctions:get-all');
    });

    socket.on('junction:join-error', (data: { error: string }) => {
      setErrorMessage(data.error);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    return () => {
      socket.off('junctions:updated', handleJunctionsUpdate);
      socket.off('junction:join-error');
    };
  }, []);

  const handleJoinClick = (districtId: string, currentCount: number, maxCapacity: number) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (currentCount >= maxCapacity) {
      setErrorMessage('This junction is at maximum capacity (10/10 users). Please wait for a member to leave.');
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }

    onJoinJunction(districtId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="relative p-8 sm:p-10 rounded-3xl glass-panel border border-white/10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/20 via-purple-500/15 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5" />
            Tamil Nadu Sovereign Hubs (Strict 10/10 Limit)
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white">
            10 District Junctions
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Connect locally with verified residents and travelers from 10 iconic Tamil Nadu districts.
            Each junction features real-time WebRTC group audio, group chat, multiplayer gaming tables, and automatic 10-minute continuous stay moderator assignment.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Flame className="w-4 h-4" /> 10-Min Continuous Stay = Auto Moderator
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
              <Lock className="w-4 h-4" /> Atomic 10-User Max Capacity Lock
            </span>
          </div>
        </div>
      </div>

      {/* Error alert toast */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs font-semibold animate-shake">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Junctions Grid (Exactly 10 Districts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {junctions.map((j) => {
          const isFull = j.currentCount >= j.maxCapacity;
          const capacityPercent = (j.currentCount / j.maxCapacity) * 100;

          return (
            <div
              key={j.id}
              className={`rounded-3xl glass-panel p-6 border transition-all duration-300 flex flex-col justify-between ${
                isFull
                  ? 'border-rose-500/30 bg-rose-950/10 opacity-90'
                  : 'border-white/10 hover:border-stranger-purple/40 hover:shadow-xl hover:shadow-stranger-purple/10 hover:-translate-y-1'
              }`}
            >
              <div className="space-y-4">
                
                {/* District Title & Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-xl text-white flex items-center gap-2">
                      {j.name}
                      <span className="text-xs font-sans font-normal text-slate-400">Junction</span>
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{j.tagline}</p>
                  </div>

                  {isFull ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Full
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Available
                    </span>
                  )}
                </div>

                {/* District Landmark Card Art */}
                <div 
                  className="h-28 rounded-2xl relative overflow-hidden flex flex-col justify-end p-4 border border-white/5"
                  style={{
                    background: `linear-gradient(135deg, ${j.accentColor}25, #070B19 90%)`
                  }}
                >
                  <div className="absolute top-3 right-3 text-2xl opacity-20">
                    <MapPin className="w-8 h-8 text-white" />
                  </div>
                  <div className="relative z-10">
                    <span className="text-[10px] text-cyan-300 font-semibold uppercase tracking-wider">
                      Famous Landmark
                    </span>
                    <h4 className="text-xs font-bold text-white line-clamp-1">
                      {j.landmark}
                    </h4>
                  </div>
                </div>

                {/* Capacity Counter & Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Room Capacity
                    </span>
                    <span className={`font-mono font-bold ${isFull ? 'text-rose-400' : 'text-cyan-400'}`}>
                      {j.currentCount} / {j.maxCapacity} Users
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-dark-900 overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isFull
                          ? 'bg-rose-500'
                          : capacityPercent > 60
                          ? 'bg-amber-400'
                          : 'bg-gradient-to-r from-cyan-400 to-purple-500'
                      }`}
                      style={{ width: `${capacityPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Active Participants Avatars preview */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center -space-x-2 overflow-hidden">
                    {j.participants.length > 0 ? (
                      j.participants.slice(0, 5).map((p) => (
                        <img
                          key={p.userId}
                          src={p.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`}
                          alt={p.username}
                          title={`${p.username} (${p.role})`}
                          className="w-7 h-7 rounded-full border-2 border-dark-900 object-cover"
                        />
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">No users inside yet</span>
                    )}
                    {j.participants.length > 5 && (
                      <div className="w-7 h-7 rounded-full bg-dark-800 border-2 border-dark-900 text-[10px] font-bold text-slate-300 flex items-center justify-center">
                        +{j.participants.length - 5}
                      </div>
                    )}
                  </div>

                  {j.activeModeratorId && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                      Mod Active
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                disabled={isFull}
                onClick={() => handleJoinClick(j.id, j.currentCount, j.maxCapacity)}
                className={`mt-6 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs transition-all shadow-lg ${
                  isFull
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-gradient-to-r from-stranger-purple to-stranger-blue text-white hover:opacity-95 active:scale-95 shadow-stranger-purple/20'
                }`}
              >
                {isFull ? (
                  <span>Junction Full (10/10)</span>
                ) : (
                  <>
                    <span>Join Junction</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
