import React from 'react';
import { ShieldCheck, Heart, Radio, MapPin, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 bg-dark-950/90 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Brand Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 p-[2px]">
              <div className="w-full h-full bg-dark-900 rounded-[10px] flex items-center justify-center">
                <img src="/logo.svg" alt="StrangerVerse" className="w-5 h-5" />
              </div>
            </div>
            <span className="font-display font-bold text-lg text-white">STRANGERVERSE</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            The next-generation stranger communication, local community, and multiplayer gaming platform for Tamil Nadu and beyond.
          </p>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            All 10 District Junctions Operational
          </div>
        </div>

        {/* 10 Districts Overview */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-stranger-purple" />
            Tamil Nadu Junctions
          </h4>
          <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-400">
            <span>• Chennai</span>
            <span>• Vellore</span>
            <span>• Tiruchirappalli</span>
            <span>• Madurai</span>
            <span>• Kanniyakumari</span>
            <span>• Salem</span>
            <span>• Coimbatore</span>
            <span>• Erode</span>
            <span>• Tirunelveli</span>
            <span>• Thanjavur</span>
          </div>
        </div>

        {/* Entertainment & Gaming */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Platform Modes
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-400">
            <li>• 1-on-1 Random Voice Chat</li>
            <li>• 1-on-1 Random Text Chat</li>
            <li>• 10-User District Junctions</li>
            <li>• Multiplayer UNO Card Battles</li>
            <li>• 4-Player Futuristic Ludo</li>
            <li>• Live Truth or Dare Interactive Session</li>
          </ul>
        </div>

        {/* Safety & Moderation */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-pink-500" />
            Safety & Governance
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Automatic 10-minute continuous stay moderator promotion, anti-spam rate limiting, report channels, and 4-tier cryptographic role governance.
          </p>
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-300">
            Level 1 Permanent Owner protection active. No self-promotions permitted.
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
        <p>© 2026 STRANGERVERSE. All rights reserved. Original Design & Architecture.</p>
        <p className="flex items-center gap-1">
          Engineered with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" /> for meaningful stranger connections.
        </p>
      </div>
    </footer>
  );
};
