import React from 'react';
import { 
  Radio, 
  MessageSquare, 
  MapPin, 
  Gamepad2, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Users, 
  Lock, 
  ArrowRight,
  Headphones,
  Flame,
  Award
} from 'lucide-react';
import { User } from '../types';

interface LandingViewProps {
  user: User | null;
  onNavigate: (tab: string) => void;
  onOpenAuth: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  user,
  onNavigate,
  onOpenAuth
}) => {
  return (
    <div className="space-y-20 pb-16">
      
      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-12 overflow-hidden">
        {/* Ambient Glowing Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-stranger-purple/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-stranger-blue/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-stranger-cyan/15 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative max-w-5xl mx-auto px-4 text-center space-y-8">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel border border-cyan-400/30 text-cyan-300 text-xs font-semibold shadow-lg shadow-cyan-500/10">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Tamil Nadu's Premier Real-Time Socialverse</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black tracking-tight text-white leading-tight">
            Meet Strangers. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-500">
              Connect Locally.
            </span> <br />
            Play Together.
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 font-normal leading-relaxed">
            Welcome to <strong className="text-white">STRANGERVERSE</strong> — a brand new futuristic social platform.
            Jump into 1-on-1 stranger voice calls, text matching, 10 Tamil Nadu district junctions with automatic 10-minute stay moderation, and multiplayer UNO, Ludo, and Truth or Dare!
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onNavigate('voice')}
              className="flex items-center gap-3 px-7 py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-stranger-cyan via-stranger-blue to-stranger-purple text-white shadow-xl shadow-stranger-blue/30 hover:scale-105 active:scale-95 transition-all"
            >
              <Headphones className="w-5 h-5" />
              <span>Random Voice Chat</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={() => onNavigate('text')}
              className="flex items-center gap-3 px-7 py-4 rounded-2xl font-bold text-sm glass-panel border border-white/20 text-white hover:bg-white/10 hover:border-stranger-purple/50 shadow-lg active:scale-95 transition-all"
            >
              <MessageSquare className="w-5 h-5 text-stranger-purple" />
              <span>Random Text Chat</span>
            </button>

            <button
              onClick={() => onNavigate('junctions')}
              className="flex items-center gap-3 px-7 py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 active:scale-95 transition-all"
            >
              <MapPin className="w-5 h-5 text-emerald-400" />
              <span>Tamil Nadu Junctions (10/10)</span>
            </button>
          </div>

          {/* Quick status bar */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" /> WebRTC Ultra-Low Latency
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" /> Automatic Stay-Moderator System
            </span>
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" /> Level 1 Super Manager Sovereignty
            </span>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            Everything You Need in One Unified Platform
          </h2>
          <p className="text-sm text-slate-400">
            Engineered with strict real-time WebSockets, WebRTC mesh audio, and server-authoritative logic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Random Voice & Text */}
          <div 
            onClick={() => onNavigate('voice')}
            className="p-8 rounded-3xl glass-panel glass-panel-hover cursor-pointer border border-white/10 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
              Independent Stranger Voice & Text
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Real-time WebRTC audio with animated voice activity visualizer, microphone muting, next stranger matching, and dedicated instant text chat with typing indicators.
            </p>
            <div className="flex items-center text-xs font-semibold text-cyan-400 gap-1.5">
              Launch Voice Match <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: 10 Tamil Nadu Junctions */}
          <div 
            onClick={() => onNavigate('junctions')}
            className="p-8 rounded-3xl glass-panel glass-panel-hover cursor-pointer border border-white/10 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
              10 District Junctions (10/10 Max)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Dedicated rooms for Chennai, Vellore, Trichy, Madurai, Kanniyakumari, Salem, Coimbatore, Erode, Tirunelveli, and Thanjavur. Atomic capacity limits strictly prevent the 11th user.
            </p>
            <div className="flex items-center text-xs font-semibold text-purple-400 gap-1.5">
              Explore 10 Districts <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3: Multiplayer Games */}
          <div 
            onClick={() => onNavigate('games')}
            className="p-8 rounded-3xl glass-panel glass-panel-hover cursor-pointer border border-white/10 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-pink-300 transition-colors">
              Multiplayer UNO, Ludo & Truth or Dare
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Play full 2-4 player UNO with wild cards and shouts, roll the 3D dice in Ludo with safe zones and captures, or spin the bottle in Truth or Dare with hundreds of curated challenges.
            </p>
            <div className="flex items-center text-xs font-semibold text-pink-400 gap-1.5">
              Play Games Now <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* District Preview Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl glass-panel border border-white/10 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
                <Flame className="w-4 h-4" />
                Auto-Moderation Active
              </div>
              <h3 className="text-2xl font-bold text-white font-display">
                Stay 10 Continuous Minutes to Become Moderator
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                Stay continuously active in any Tamil Nadu Junction. After 10 minutes, eligible users are automatically promoted by trusted backend logic to moderate the room!
              </p>
            </div>

            <button
              onClick={() => onNavigate('junctions')}
              className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-600/30 hover:opacity-95 whitespace-nowrap"
            >
              Join a District Room
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
