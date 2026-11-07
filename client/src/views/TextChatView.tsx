import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  SkipForward, 
  LogOut, 
  ShieldAlert, 
  Flag, 
  Smile, 
  Sparkles,
  Users
} from 'lucide-react';
import { User, ChatMessage1on1 } from '../types';
import { socket } from '../services/socket';
import { sound } from '../services/sound';
import { ReportModal } from '../components/ReportModal';

interface TextChatViewProps {
  user: User | null;
  onOpenAuth: () => void;
}

type ChatStatus = 'IDLE' | 'SEARCHING' | 'CONNECTED' | 'DISCONNECTED';

export const TextChatView: React.FC<TextChatViewProps> = ({ user, onOpenAuth }) => {
  const [status, setStatus] = useState<ChatStatus>('IDLE');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stranger, setStranger] = useState<{ id: string; displayName: string; photoURL?: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage1on1[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStrangerTyping, setIsStrangerTyping] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to text strangers.');
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStrangerTyping]);

  useEffect(() => {
    socket.on('text:searching', (data: { status: string }) => {
      setStatus('SEARCHING');
      setStatusMessage(data.status || 'Searching for an online stranger to chat...');
    });

    socket.on('text:matched', (data: { sessionId: string; stranger: { id: string; displayName: string; photoURL?: string } }) => {
      setSessionId(data.sessionId);
      setStranger(data.stranger);
      setStatus('CONNECTED');
      setStatusMessage(`Connected with ${data.stranger.displayName}! Say hello.`);
      setMessages([]);
      sound.playMatchSuccess();
    });

    socket.on('text:message', (msg: ChatMessage1on1) => {
      setMessages(prev => [...prev, msg]);
      sound.playMessageSound();
    });

    socket.on('text:typing', (data: { isTyping: boolean }) => {
      setIsStrangerTyping(data.isTyping);
    });

    socket.on('text:stranger-disconnected', (data: { message: string }) => {
      setStatus('DISCONNECTED');
      setStatusMessage(data.message || 'Stranger has disconnected.');
      setIsStrangerTyping(false);
    });

    return () => {
      socket.off('text:searching');
      socket.off('text:matched');
      socket.off('text:message');
      socket.off('text:typing');
      socket.off('text:stranger-disconnected');
    };
  }, []);

  const startTextSearch = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setStatus('SEARCHING');
    setStatusMessage('Searching for an online stranger to chat...');
    setMessages([]);
    setStranger(null);
    socket.emit('text:join-queue', user);
  };

  const handleNextStranger = () => {
    if (sessionId) {
      socket.emit('text:leave', { sessionId });
    }
    startTextSearch();
  };

  const handleDisconnect = () => {
    if (sessionId) {
      socket.emit('text:leave', { sessionId });
    }
    setStatus('IDLE');
    setSessionId(null);
    setStranger(null);
    setStatusMessage('Disconnected. Click start to find a new stranger.');
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !sessionId || status !== 'CONNECTED') return;

    socket.emit('text:message', {
      sessionId,
      text: inputText.trim()
    });

    socket.emit('text:typing', { sessionId, isTyping: false });
    setInputText('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (sessionId && status === 'CONNECTED') {
      socket.emit('text:typing', { sessionId, isTyping: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => {
        socket.emit('text:typing', { sessionId, isTyping: false });
      }, 1500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header Info */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold">
          <MessageSquare className="w-3.5 h-3.5 animate-pulse" />
          Independent Instant Text Matchmaking
        </div>
        <h2 className="text-3xl font-display font-extrabold text-white">
          Random Stranger Text Chat
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Chat privately and securely with verified strangers across the network.
        </p>
      </div>

      {/* Main Chat Box */}
      <div className="rounded-3xl glass-panel border border-white/10 overflow-hidden shadow-2xl flex flex-col h-[560px]">
        
        {/* Chat Header Toolbar */}
        <div className="p-4 bg-dark-900/90 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {stranger ? (
              <img
                src={stranger.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${stranger.displayName}`}
                alt={stranger.displayName}
                className="w-10 h-10 rounded-xl object-cover border border-purple-500"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                <Users className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">
                  {stranger ? stranger.displayName : 'Stranger Matchmaking'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-white/5 border border-white/10 text-cyan-400">
                  {status}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {isStrangerTyping ? (
                  <span className="text-cyan-400 animate-pulse font-medium">Stranger is typing...</span>
                ) : (
                  statusMessage
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status === 'CONNECTED' && (
              <>
                <button
                  onClick={() => setReportModalOpen(true)}
                  title="Report User"
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-rose-400 border border-white/10 transition-colors"
                >
                  <Flag className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextStranger}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-stranger-purple hover:bg-purple-600 text-white shadow transition-all"
                >
                  <SkipForward className="w-4 h-4" />
                  Next
                </button>
                <button
                  onClick={handleDisconnect}
                  className="p-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            )}

            {status === 'SEARCHING' && (
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
              >
                Cancel Search
              </button>
            )}

            {(status === 'IDLE' || status === 'DISCONNECTED') && (
              <button
                onClick={startTextSearch}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-purple-600 text-white shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Start Chatting
              </button>
            )}
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 bg-dark-950/40">
          {status === 'IDLE' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-3 text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-500" />
              <p className="text-sm">Click "Start Chatting" to match with a live stranger.</p>
            </div>
          )}

          {status === 'SEARCHING' && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 animate-spin">
                <Sparkles className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-white">Matching with an available stranger...</p>
            </div>
          )}

          {status === 'DISCONNECTED' && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-2">
              <p className="text-xs text-rose-300 font-semibold">{statusMessage}</p>
              <button
                onClick={startTextSearch}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-stranger-purple text-white shadow hover:opacity-95"
              >
                Find Next Stranger
              </button>
            </div>
          )}

          {messages.map((m) => {
            const isMe = m.senderSocketId === socket.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
                    isMe
                      ? 'bg-gradient-to-r from-stranger-blue to-stranger-purple text-white rounded-br-none'
                      : 'bg-dark-850 border border-white/10 text-slate-100 rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}

          {isStrangerTyping && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-dark-850 w-20 border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]"></span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={sendMessage} className="p-3 bg-dark-900 border-t border-white/10 flex items-center gap-2">
          <input
            type="text"
            disabled={status !== 'CONNECTED'}
            value={inputText}
            onChange={handleInputChange}
            placeholder={status === 'CONNECTED' ? "Type a message to stranger..." : "Connect to chat..."}
            className="flex-1 px-4 py-3 rounded-2xl bg-dark-950 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={status !== 'CONNECTED' || !inputText.trim()}
            className="p-3 rounded-2xl bg-gradient-to-r from-stranger-cyan to-stranger-purple text-white disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      <ReportModal
        isOpen={reportModalOpen}
        reportedUser={stranger}
        reporterUser={user}
        context="1-on-1 Text Chat"
        onClose={() => setReportModalOpen(false)}
      />
    </div>
  );
};
