import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Send, 
  LogOut, 
  ShieldAlert, 
  ShieldCheck, 
  Users, 
  Crown, 
  Flame, 
  Gamepad2, 
  MapPin, 
  Sparkles, 
  Clock, 
  AlertCircle,
  Flag,
  UserX,
  Radio
} from 'lucide-react';
import { User, JunctionMessage, Role, ActiveGameState } from '../types';
import { socket } from '../services/socket';
import { webrtcManager } from '../services/webrtc';
import { sound } from '../services/sound';
import { MultiplayerGamesView } from './MultiplayerGamesView';
import { ReportModal } from '../components/ReportModal';

interface JunctionParticipant {
  userId: string;
  username: string;
  photoURL?: string;
  role: Role;
  joinedAt: number;
  isMicOn: boolean;
  isMutedByMod: boolean;
}

interface JunctionRoomViewProps {
  districtId: string;
  user: User | null;
  onLeave: () => void;
}

export const JunctionRoomView: React.FC<JunctionRoomViewProps> = ({
  districtId,
  user,
  onLeave
}) => {
  const [junctionData, setJunctionData] = useState<{
    id: string;
    name: string;
    tagline: string;
    landmark: string;
    accentColor: string;
    maxCapacity: number;
    activeModeratorId: string | null;
  } | null>(null);

  const [participants, setParticipants] = useState<JunctionParticipant[]>([]);
  const [messages, setMessages] = useState<JunctionMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isMicOn, setIsMicOn] = useState(false);
  const [localMutedUsers, setLocalMutedUsers] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'chat' | 'games'>('chat');
  const [promotionNotice, setPromotionNotice] = useState<string | null>(null);
  const [kickedNotice, setKickedNotice] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ id: string; displayName: string } | null>(null);
  const [activeGameState, setActiveGameState] = useState<ActiveGameState | null>(null);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Join event
    if (user) {
      socket.emit('junction:join', { districtId, user });
    }

    socket.on('junction:joined-success', (data: {
      districtId: string;
      junction: {
        id: string;
        name: string;
        tagline: string;
        landmark: string;
        accentColor: string;
        maxCapacity: number;
        activeModeratorId: string | null;
        participants: JunctionParticipant[];
        messages: JunctionMessage[];
        activeGame: ActiveGameState | null;
      };
    }) => {
      setJunctionData({
        id: data.junction.id,
        name: data.junction.name,
        tagline: data.junction.tagline,
        landmark: data.junction.landmark,
        accentColor: data.junction.accentColor,
        maxCapacity: data.junction.maxCapacity,
        activeModeratorId: data.junction.activeModeratorId
      });
      setParticipants(data.junction.participants);
      setMessages(data.junction.messages || []);
      if (data.junction.activeGame) {
        setActiveGameState(data.junction.activeGame);
      }
    });

    socket.on('junction:user-joined', (data: { participant: JunctionParticipant; message: string }) => {
      setParticipants(prev => {
        if (prev.some(p => p.userId === data.participant.userId)) return prev;
        return [...prev, data.participant];
      });
      setMessages(prev => [
        ...prev,
        { id: `sys_${Date.now()}`, system: true, text: data.message, timestamp: Date.now() }
      ]);
    });

    socket.on('junction:user-left', (data: { userId: string; username: string }) => {
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
      setMessages(prev => [
        ...prev,
        { id: `sys_${Date.now()}`, system: true, text: `${data.username} left the junction.`, timestamp: Date.now() }
      ]);
    });

    socket.on('junction:message', (data: { districtId: string; message: JunctionMessage }) => {
      setMessages(prev => [...prev, data.message]);
      sound.playMessageSound();
    });

    socket.on('junction:mic-state-changed', (data: { userId: string; isMicOn: boolean }) => {
      setParticipants(prev => prev.map(p => p.userId === data.userId ? { ...p, isMicOn: data.isMicOn } : p));
    });

    socket.on('junction:moderator-promoted', (data: { moderatorId: string; moderatorName: string; message: string }) => {
      setPromotionNotice(data.message);
      sound.playPromotionFanfare();
      setJunctionData(prev => prev ? { ...prev, activeModeratorId: data.moderatorId } : null);
      setParticipants(prev => prev.map(p => p.userId === data.moderatorId ? { ...p, role: 'MODERATOR' } : p));
      setTimeout(() => setPromotionNotice(null), 6000);
    });

    socket.on('junction:user-kicked', (data: { targetUserId: string; moderatorName: string }) => {
      setParticipants(prev => prev.filter(p => p.userId !== data.targetUserId));
      setMessages(prev => [
        ...prev,
        { id: `sys_${Date.now()}`, system: true, text: `A participant was removed by moderator ${data.moderatorName}.`, timestamp: Date.now() }
      ]);
    });

    socket.on('junction:you-were-kicked', (data: { message: string }) => {
      setKickedNotice(data.message);
      setTimeout(() => {
        onLeave();
      }, 3000);
    });

    socket.on('junction:user-mute-toggled', (data: { targetUserId: string; isMuted: boolean }) => {
      setParticipants(prev => prev.map(p => {
        if (p.userId === data.targetUserId) {
          return { ...p, isMutedByMod: data.isMuted, isMicOn: data.isMuted ? false : p.isMicOn };
        }
        return p;
      }));
    });

    socket.on('game:updated', (data: { districtId: string; gameState: ActiveGameState | null }) => {
      if (data.districtId === districtId) {
        setActiveGameState(data.gameState);
      }
    });

    return () => {
      socket.off('junction:joined-success');
      socket.off('junction:user-joined');
      socket.off('junction:user-left');
      socket.off('junction:message');
      socket.off('junction:mic-state-changed');
      socket.off('junction:moderator-promoted');
      socket.off('junction:user-kicked');
      socket.off('junction:you-were-kicked');
      socket.off('junction:user-mute-toggled');
      socket.off('game:updated');
    };
  }, [districtId, user]);

  const handleLeave = () => {
    socket.emit('junction:leave', { districtId });
    webrtcManager.cleanup();
    onLeave();
  };

  const toggleMic = async () => {
    const next = !isMicOn;
    if (next) {
      await webrtcManager.requestMicrophone();
      webrtcManager.setMute(false);
    } else {
      webrtcManager.setMute(true);
    }
    setIsMicOn(next);
    socket.emit('junction:mic-state', { districtId, isMicOn: next });
  };

  const toggleLocalMute = (userId: string) => {
    setLocalMutedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    socket.emit('junction:message', {
      districtId,
      text: inputText.trim()
    });
    setInputText('');
  };

  const handleKickParticipant = (targetUserId: string) => {
    socket.emit('junction:kick-participant', { districtId, targetUserId });
  };

  const handleMuteParticipant = (targetUserId: string, currentMute: boolean) => {
    socket.emit('junction:mute-participant', {
      districtId,
      targetUserId,
      isMuted: !currentMute
    });
  };

  const isOwner = user?.role === 'OWNER';
  const isManager = user?.role === 'MANAGER';
  const isRoomMod = junctionData?.activeModeratorId === user?.id || user?.role === 'MODERATOR' || isManager || isOwner;

  if (kickedNotice) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-3xl glass-panel border border-rose-500/30 text-center space-y-4">
        <AlertCircle className="w-14 h-14 text-rose-500 mx-auto" />
        <h3 className="font-bold text-lg text-white">Removed from Junction</h3>
        <p className="text-xs text-rose-300">{kickedNotice}</p>
        <p className="text-xs text-slate-400">Returning to Junctions directory...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner Header */}
      <div className="p-6 rounded-3xl glass-panel border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div 
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
            style={{ backgroundColor: junctionData?.accentColor || '#3B82F6' }}
          >
            <MapPin className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-extrabold text-2xl text-white">
                {junctionData?.name} Junction
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/5 border border-white/10 text-cyan-400">
                {participants.length} / 10 Users
              </span>
            </div>
            <p className="text-xs text-slate-400">{junctionData?.landmark} • {junctionData?.tagline}</p>
          </div>
        </div>

        {/* Toolbar Tabs & Controls */}
        <div className="flex items-center gap-3">
          
          {/* View Tab Toggle */}
          <div className="p-1 rounded-2xl bg-dark-900 border border-white/10 flex items-center">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-stranger-purple to-stranger-blue text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Comms & Chat
            </button>
            <button
              onClick={() => setActiveTab('games')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'games'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Multiplayer Games</span>
              {activeGameState && (
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping"></span>
              )}
            </button>
          </div>

          {/* Group Mic Mute/Unmute */}
          <button
            onClick={toggleMic}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all ${
              isMicOn
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-white/10 text-slate-300 hover:bg-white/15 border border-white/10'
            }`}
          >
            {isMicOn ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
            <span>{isMicOn ? 'Mic Live' : 'Mute Mic'}</span>
          </button>

          {/* Leave Button */}
          <button
            onClick={handleLeave}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-xs bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition-all shadow"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Junction</span>
          </button>
        </div>
      </div>

      {/* Promotion Alert Banner */}
      {promotionNotice && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-cyan-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-2 animate-bounce">
          <Crown className="w-5 h-5 text-amber-400" />
          <span>{promotionNotice}</span>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'games' ? (
        <MultiplayerGamesView
          districtId={districtId}
          user={user}
          participants={participants}
          activeGameState={activeGameState}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Participants Side Panel (1 Col) */}
          <div className="lg:col-span-1 rounded-3xl glass-panel border border-white/10 p-5 space-y-4 h-[600px] flex flex-col">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                In Junction ({participants.length}/10)
              </span>
              <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3" /> AutoMod 10m
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {participants.map((p) => {
                const stayMins = Math.floor((Date.now() - p.joinedAt) / 60000);
                const staySecs = Math.floor(((Date.now() - p.joinedAt) % 60000) / 1000);
                const isUserOwner = p.role === 'OWNER';
                const isTargetMe = p.userId === user?.id;

                return (
                  <div
                    key={p.userId}
                    className="p-3 rounded-2xl bg-white/5 border border-white/5 space-y-2 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <img
                            src={p.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`}
                            alt={p.username}
                            className="w-9 h-9 rounded-xl object-cover"
                          />
                          {p.isMicOn && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-dark-900 animate-pulse"></span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span className="truncate max-w-[90px]">{p.username}</span>
                            {isUserOwner && <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Stay: {stayMins}m {staySecs}s
                          </span>
                        </div>
                      </div>

                      {/* Participant Audio and Mod Badges */}
                      <div className="flex items-center gap-1">
                        {p.isMicOn ? (
                          <Mic className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <MicOff className="w-3.5 h-3.5 text-slate-500" />
                        )}

                        {!isTargetMe && (
                          <button
                            onClick={() => toggleLocalMute(p.userId)}
                            title={localMutedUsers[p.userId] ? 'Unmute locally' : 'Mute locally'}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            {localMutedUsers[p.userId] ? (
                              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Moderator / Owner In-Room Actions */}
                    {isRoomMod && !isTargetMe && !isUserOwner && (
                      <div className="pt-1.5 border-t border-white/5 flex items-center justify-end gap-1.5 text-[10px]">
                        <button
                          onClick={() => handleMuteParticipant(p.userId, p.isMutedByMod)}
                          className={`px-2 py-0.5 rounded-lg border font-semibold ${
                            p.isMutedByMod
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-white/5 text-slate-300 hover:text-white border-white/10'
                          }`}
                        >
                          {p.isMutedByMod ? 'Unmute' : 'Mod Mute'}
                        </button>
                        <button
                          onClick={() => handleKickParticipant(p.userId)}
                          className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 font-semibold"
                        >
                          Kick
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group Chat Feed (3 Cols) */}
          <div className="lg:col-span-3 rounded-3xl glass-panel border border-white/10 overflow-hidden h-[600px] flex flex-col shadow-2xl">
            
            {/* Feed Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-dark-950/40">
              {messages.map((m) => {
                if (m.system) {
                  return (
                    <div key={m.id} className="text-center py-1">
                      <span className="px-3 py-1 rounded-full text-[11px] bg-white/5 border border-white/5 text-cyan-300 font-medium">
                        {m.text}
                      </span>
                    </div>
                  );
                }

                const isMe = m.userId === user?.id;
                const isOwnerMsg = m.userRole === 'OWNER';

                return (
                  <div key={m.id} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <img
                      src={m.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.username}`}
                      alt={m.username}
                      className="w-8 h-8 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="font-bold text-slate-200">{m.username}</span>
                        {isOwnerMsg && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            OWNER
                          </span>
                        )}
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isMe
                            ? 'bg-gradient-to-r from-stranger-purple to-indigo-600 text-white rounded-tr-none'
                            : 'bg-dark-850 border border-white/10 text-slate-100 rounded-tl-none'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-3 bg-dark-900 border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Message all members in ${junctionData?.name} Junction...`}
                className="flex-1 px-4 py-3 rounded-2xl bg-dark-950 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-600 text-white disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shadow"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={Boolean(reportTarget)}
        reportedUser={reportTarget}
        reporterUser={user}
        context={`${junctionData?.name} Junction`}
        onClose={() => setReportTarget(null)}
      />
    </div>
  );
};
