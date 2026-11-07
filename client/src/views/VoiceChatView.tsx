import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  SkipForward, 
  Radio, 
  ShieldAlert, 
  Volume2, 
  Sparkles, 
  AlertCircle,
  Flag,
  UserCheck
} from 'lucide-react';
import { User } from '../types';
import { socket } from '../services/socket';
import { webrtcManager } from '../services/webrtc';
import { sound } from '../services/sound';
import { ReportModal } from '../components/ReportModal';

interface VoiceChatViewProps {
  user: User | null;
  onOpenAuth: () => void;
}

type CallStatus = 'IDLE' | 'SEARCHING' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';

export const VoiceChatView: React.FC<VoiceChatViewProps> = ({ user, onOpenAuth }) => {
  const [status, setStatus] = useState<CallStatus>('IDLE');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stranger, setStranger] = useState<{ id: string; displayName: string; photoURL?: string } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Ready to meet random voice strangers.');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const statusRef = useRef(status);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    statusRef.current = status;
    isMutedRef.current = isMuted;
  }, [status, isMuted]);

  // Timer for active call
  useEffect(() => {
    let interval: number;
    if (status === 'CONNECTED') {
      interval = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Audio visualizer and WebRTC stream hookup (persisted throughout component lifetime)
  useEffect(() => {
    webrtcManager.onVolumeChange = (vol) => {
      if (statusRef.current === 'CONNECTED' && !isMutedRef.current) {
        setVolumeLevel(vol);
      } else {
        setVolumeLevel(0);
      }
    };

    webrtcManager.onRemoteStream = (stream) => {
      console.log('[WebRTC] Outputting remote audio stream:', stream);
      remoteStreamRef.current = stream;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.muted = false;
        remoteAudioRef.current.play().catch(e => {
          console.warn('[WebRTC] Audio play retry/prompt:', e);
        });
      }
    };

    webrtcManager.onConnectionStateChange = (state) => {
      console.log('[WebRTC State]', state);
      if (state === 'connected') {
        setStatus('CONNECTED');
        setStatusMessage('Audio stream encrypted and live!');
        sound.playMatchSuccess();
        if (remoteAudioRef.current && remoteStreamRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
          remoteAudioRef.current.play().catch(() => {});
        }
      } else if (state === 'failed' || state === 'disconnected') {
        handleStrangerLeft('Voice connection interrupted.');
      }
    };

    return () => {
      webrtcManager.onVolumeChange = null;
      webrtcManager.onRemoteStream = null;
      webrtcManager.onConnectionStateChange = null;
    };
  }, []);

  // Socket event listeners for 1-on-1 voice
  useEffect(() => {
    socket.on('voice:searching', (data: { status: string }) => {
      setStatus('SEARCHING');
      setStatusMessage(data.status || 'Searching for a stranger with mic active...');
    });

    socket.on('voice:matched', async (data: { sessionId: string; isInitiator: boolean; stranger: { id: string; displayName: string; photoURL?: string } }) => {
      setSessionId(data.sessionId);
      setStranger(data.stranger);
      setStatus('CONNECTING');
      setStatusMessage(`Found stranger! Connecting WebRTC audio channel...`);

      // Initialize WebRTC
      try {
        await webrtcManager.requestMicrophone();
        await webrtcManager.init1on1PeerConnection(data.sessionId, data.isInitiator);
      } catch (err) {
        console.error('[WebRTC] Connection setup error:', err);
      }
    });

    socket.on('voice:signal', (data: { sessionId: string; signal: { type: string } }) => {
      webrtcManager.handleSignal(data.signal, data.sessionId);
    });

    socket.on('voice:stranger-disconnected', (data: { message: string }) => {
      handleStrangerLeft(data.message || 'Stranger has disconnected from the call.');
    });

    return () => {
      socket.off('voice:searching');
      socket.off('voice:matched');
      socket.off('voice:signal');
      socket.off('voice:stranger-disconnected');
    };
  }, []);

  const handleStrangerLeft = (msg: string) => {
    setStatus('DISCONNECTED');
    setStatusMessage(msg);
    webrtcManager.cleanupPeerConnection();
  };

  const startVoiceSearch = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    try {
      setStatus('SEARCHING');
      setStatusMessage('Acquiring microphone & entering matchmaking pool...');
      await webrtcManager.requestMicrophone();
      socket.emit('voice:join-queue', user);
    } catch (e) {
      setStatus('IDLE');
      setStatusMessage('Microphone access required to join voice chat.');
    }
  };

  const handleNextStranger = () => {
    if (sessionId) {
      socket.emit('voice:leave', { sessionId });
    }
    webrtcManager.cleanupPeerConnection();
    setStranger(null);
    startVoiceSearch();
  };

  const handleDisconnect = () => {
    if (sessionId) {
      socket.emit('voice:leave', { sessionId });
    }
    webrtcManager.cleanupPeerConnection();
    setStatus('IDLE');
    setStranger(null);
    setSessionId(null);
    setStatusMessage('Call ended. Click Start to match again.');
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    webrtcManager.setMute(nextMute);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      
      {/* Hidden audio element for receiving remote peer audio stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Header Info */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          WebRTC Encrypted Peer Audio
        </div>
        <h2 className="text-3xl font-display font-extrabold text-white">
          Random Stranger Voice Chat
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Match and speak directly with available strangers in real time. Instant WebRTC audio mesh.
        </p>
      </div>

      {/* Central Visualizer & Stage Card */}
      <div className="relative rounded-3xl glass-panel border border-white/10 p-8 sm:p-12 overflow-hidden shadow-2xl">
        
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-tr from-stranger-purple/20 via-cyan-500/15 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center justify-center space-y-8 min-h-[340px]">
          
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-dark-900/90 border border-white/10 text-xs font-semibold">
            {status === 'IDLE' && <span className="w-2 h-2 rounded-full bg-slate-500"></span>}
            {status === 'SEARCHING' && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>}
            {status === 'CONNECTING' && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>}
            {status === 'CONNECTED' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
            {status === 'DISCONNECTED' && <span className="w-2 h-2 rounded-full bg-rose-500"></span>}
            <span className="text-slate-300 font-mono uppercase tracking-wider">{status}</span>
          </div>

          {/* Dynamic Radar / Avatars / Waveform Area */}
          {status === 'IDLE' && (
            <div className="text-center space-y-4">
              <div className="w-28 h-28 mx-auto rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
                <Radio className="w-12 h-12" />
              </div>
              <p className="text-sm text-slate-300 max-w-sm">{statusMessage}</p>
              <button
                onClick={startVoiceSearch}
                className="px-8 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-stranger-cyan via-stranger-blue to-stranger-purple text-white shadow-xl shadow-stranger-blue/30 hover:scale-105 active:scale-95 transition-all"
              >
                Start Voice Chat
              </button>
            </div>
          )}

          {status === 'SEARCHING' && (
            <div className="text-center space-y-6">
              <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                {/* Radar Waves */}
                <div className="absolute inset-0 rounded-full border border-cyan-400/40 animate-ping"></div>
                <div className="absolute inset-4 rounded-full border border-purple-400/40 animate-pulse"></div>
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
                  <Mic className="w-9 h-9 animate-bounce" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Scanning for Strangers...</h4>
                <p className="text-xs text-slate-400">Waiting for next person with microphone enabled</p>
              </div>
            </div>
          )}

          {(status === 'CONNECTING' || status === 'CONNECTED' || status === 'DISCONNECTED') && (
            <div className="w-full flex flex-col items-center space-y-6">
              
              {/* Stranger Profile & Call Timer */}
              <div className="flex items-center gap-6">
                
                {/* Local user avatar */}
                <div className="flex flex-col items-center space-y-1">
                  <div className="relative">
                    <img
                      src={user?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.displayName || 'you'}`}
                      alt="You"
                      className="w-16 h-16 rounded-2xl border-2 border-stranger-cyan object-cover shadow-lg"
                    />
                    {isMuted && (
                      <span className="absolute -bottom-1 -right-1 p-1 rounded-full bg-rose-500 text-white shadow">
                        <MicOff className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-white">You</span>
                </div>

                {/* Animated Connection Bridge & Waveform */}
                <div className="flex flex-col items-center space-y-2">
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-dark-900/90 px-3 py-1 rounded-full border border-white/10">
                    {formatDuration(callDuration)}
                  </span>
                  
                  {/* Dynamic sound bar visualizer */}
                  <div className="flex items-center gap-1.5 h-8 px-3">
                    <div className="w-1 rounded-full bg-cyan-400 sound-bar" style={{ height: `${Math.max(6, volumeLevel * 0.4)}px` }}></div>
                    <div className="w-1 rounded-full bg-purple-400 sound-bar" style={{ height: `${Math.max(8, volumeLevel * 0.7)}px` }}></div>
                    <div className="w-1 rounded-full bg-cyan-300 sound-bar" style={{ height: `${Math.max(12, volumeLevel * 0.9)}px` }}></div>
                    <div className="w-1 rounded-full bg-purple-400 sound-bar" style={{ height: `${Math.max(8, volumeLevel * 0.6)}px` }}></div>
                    <div className="w-1 rounded-full bg-cyan-400 sound-bar" style={{ height: `${Math.max(6, volumeLevel * 0.3)}px` }}></div>
                  </div>
                </div>

                {/* Remote stranger avatar */}
                <div className="flex flex-col items-center space-y-1">
                  <img
                    src={stranger?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${stranger?.displayName || 'stranger'}`}
                    alt="Stranger"
                    className="w-16 h-16 rounded-2xl border-2 border-purple-500 object-cover shadow-lg"
                  />
                  <span className="text-xs font-bold text-white max-w-[100px] truncate">
                    {stranger?.displayName || 'Stranger'}
                  </span>
                </div>
              </div>

              {/* Status Message Text */}
              <p className="text-xs text-slate-300 font-medium text-center max-w-md">
                {statusMessage}
              </p>

              {/* Call Control Toolbar */}
              <div className="flex items-center gap-4 pt-4">
                
                {/* Mute/Unmute */}
                <button
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
                  className={`p-4 rounded-2xl font-semibold transition-all ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                  }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                {/* Next Stranger */}
                <button
                  onClick={handleNextStranger}
                  className="flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-stranger-purple to-indigo-600 text-white shadow-lg hover:opacity-95 active:scale-95 transition-all"
                >
                  <SkipForward className="w-5 h-5" />
                  <span>Next Stranger</span>
                </button>

                {/* Disconnect */}
                <button
                  onClick={handleDisconnect}
                  title="Disconnect Call"
                  className="p-4 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30 active:scale-95 transition-all"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>

                {/* Report Stranger */}
                {stranger && (
                  <button
                    onClick={() => setReportModalOpen(true)}
                    title="Report Stranger"
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors"
                  >
                    <Flag className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        reportedUser={stranger}
        reporterUser={user}
        context="1-on-1 Voice Chat"
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
};
