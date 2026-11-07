import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Gamepad2, 
  Sparkles, 
  RotateCcw, 
  Crown, 
  Trophy, 
  Dice1, 
  Dice2, 
  Dice3, 
  Dice4, 
  Dice5, 
  Dice6, 
  Flame, 
  ShieldAlert, 
  Zap, 
  AlertTriangle,
  Play
} from 'lucide-react';
import { User, ActiveGameState, UnoState, LudoState, TruthDareState } from '../types';
import { socket } from '../services/socket';
import { sound } from '../services/sound';

interface MultiplayerGamesViewProps {
  districtId: string;
  user: User | null;
  participants: { userId: string; username: string }[];
  activeGameState: ActiveGameState | null;
}

export const MultiplayerGamesView: React.FC<MultiplayerGamesViewProps> = ({
  districtId,
  user,
  participants,
  activeGameState
}) => {
  const [selectedGameType, setSelectedGameType] = useState<'uno' | 'ludo' | 'truth_dare'>('uno');
  const [wildColorPickerOpen, setWildColorPickerOpen] = useState(false);
  const [pendingWildCardId, setPendingWildCardId] = useState<string | null>(null);
  const [currentGameState, setCurrentGameState] = useState<ActiveGameState | null>(activeGameState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (activeGameState) {
      setCurrentGameState(activeGameState);
    }
  }, [activeGameState]);

  useEffect(() => {
    // Join game channel on socket so updates are received
    socket.emit('game:join-arena', { districtId });

    const handleGameUpdate = (data: { districtId: string; gameState: ActiveGameState | null }) => {
      if (data.districtId === districtId) {
        setCurrentGameState(data.gameState);
        if (data.gameState?.status === 'FINISHED') {
          confetti({ particleCount: 100, spread: 70 });
        }
      }
    };

    const handleGameError = (data: { message: string }) => {
      setErrorMessage(data.message);
      setTimeout(() => setErrorMessage(null), 4000);
    };

    socket.on('game:updated', handleGameUpdate);
    socket.on('game:error', handleGameError);

    return () => {
      socket.off('game:updated', handleGameUpdate);
      socket.off('game:error', handleGameError);
    };
  }, [districtId]);

  const startNewGame = (gameType: 'uno' | 'ludo' | 'truth_dare') => {
    const playerIds = participants.length > 0
      ? participants.slice(0, 4).map(p => p.userId)
      : (user ? [user.id] : ['player_1']);

    socket.emit('game:start', {
      districtId,
      gameType,
      playerIds
    });
    sound.playMatchSuccess();
  };

  const handleResetGame = () => {
    socket.emit('game:reset', { districtId });
  };

  // UNO Action handlers
  const handleUnoPlayCard = (cardId: string, isWild: boolean) => {
    if (isWild) {
      setPendingWildCardId(cardId);
      setWildColorPickerOpen(true);
      return;
    }

    socket.emit('game:action', {
      districtId,
      actionType: 'PLAY_CARD',
      payload: { cardId }
    });
  };

  const handleSelectWildColor = (color: string) => {
    if (pendingWildCardId) {
      socket.emit('game:action', {
        districtId,
        actionType: 'PLAY_CARD',
        payload: { cardId: pendingWildCardId, chosenWildColor: color }
      });
      setWildColorPickerOpen(false);
      setPendingWildCardId(null);
    }
  };

  const handleUnoDrawCard = () => {
    socket.emit('game:action', {
      districtId,
      actionType: 'DRAW_CARD',
      payload: {}
    });
  };

  const handleUnoCall = () => {
    socket.emit('game:action', {
      districtId,
      actionType: 'CALL_UNO',
      payload: {}
    });
    confetti({ particleCount: 60, spread: 50 });
  };

  // Ludo Action handlers
  const handleLudoRollDice = () => {
    sound.playDiceRoll();
    socket.emit('game:action', {
      districtId,
      actionType: 'ROLL_DICE',
      payload: {}
    });
  };

  const handleLudoMoveToken = (tokenId: number) => {
    socket.emit('game:action', {
      districtId,
      actionType: 'MOVE_TOKEN',
      payload: { tokenId }
    });
  };

  // Truth or Dare handlers
  const handleTruthDareSpin = () => {
    sound.playDiceRoll();
    socket.emit('game:action', {
      districtId,
      actionType: 'SPIN_BOTTLE',
      payload: {}
    });
  };

  const handleTruthDareChoice = (mode: 'TRUTH' | 'DARE') => {
    socket.emit('game:action', {
      districtId,
      actionType: 'CHOOSE_MODE',
      payload: { mode }
    });
  };

  const handleTruthDareComplete = () => {
    socket.emit('game:action', {
      districtId,
      actionType: 'COMPLETE_TURN',
      payload: {}
    });
    confetti({ particleCount: 80, spread: 60 });
  };

  const handleTruthDareSkip = () => {
    socket.emit('game:action', {
      districtId,
      actionType: 'SKIP_TURN',
      payload: {}
    });
  };

  const getDiceIcon = (dice: number | null) => {
    switch (dice) {
      case 1: return <Dice1 className="w-12 h-12 text-white" />;
      case 2: return <Dice2 className="w-12 h-12 text-white" />;
      case 3: return <Dice3 className="w-12 h-12 text-white" />;
      case 4: return <Dice4 className="w-12 h-12 text-white" />;
      case 5: return <Dice5 className="w-12 h-12 text-white" />;
      case 6: return <Dice6 className="w-12 h-12 text-white animate-bounce" />;
      default: return <Dice1 className="w-12 h-12 text-slate-500" />;
    }
  };

  // If no game currently active, render Game Lobby selector
  if (!currentGameState) {
    return (
      <div className="rounded-3xl glass-panel border border-white/10 p-8 space-y-8 shadow-2xl">
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <h3 className="font-display font-extrabold text-2xl text-white">
            Junction Multiplayer Arena
          </h3>
          <p className="text-xs text-slate-400">
            Launch a synchronized multiplayer match with participants inside this district junction.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: UNO */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-950/40 via-dark-850 to-dark-900 border border-rose-500/20 flex flex-col justify-between space-y-4 hover:border-rose-500/50 transition-all group">
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                Card Battles (2-4 Players)
              </span>
              <h4 className="font-display font-bold text-xl text-white group-hover:text-rose-300">
                Multiplayer UNO
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Classic card game with Skip, Reverse, Draw Two, Wild Draw 4, and real-time "Call UNO!" mechanics.
              </p>
            </div>
            <button
              onClick={() => startNewGame('uno')}
              className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-rose-500 to-amber-500 text-white shadow-lg hover:opacity-95 active:scale-95 transition-all"
            >
              Start UNO Match
            </button>
          </div>

          {/* Card 2: Ludo */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-dark-850 to-dark-900 border border-indigo-500/20 flex flex-col justify-between space-y-4 hover:border-indigo-500/50 transition-all group">
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase">
                Board Game (2-4 Players)
              </span>
              <h4 className="font-display font-bold text-xl text-white group-hover:text-indigo-300">
                Futuristic Ludo
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Animated dice rolling, token capture, safe star squares, home runs, and server-validated movement.
              </p>
            </div>
            <button
              onClick={() => startNewGame('ludo')}
              className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg hover:opacity-95 active:scale-95 transition-all"
            >
              Start Ludo Match
            </button>
          </div>

          {/* Card 3: Truth or Dare */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/40 via-dark-850 to-dark-900 border border-purple-500/20 flex flex-col justify-between space-y-4 hover:border-purple-500/50 transition-all group">
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                Social Party (All Members)
              </span>
              <h4 className="font-display font-bold text-xl text-white group-hover:text-purple-300">
                Truth or Dare
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Spin the interactive bottle, pick Truth or Dare, and conquer curated, fun, and culturally vibrant challenges!
              </p>
            </div>
            <button
              onClick={() => startNewGame('truth_dare')}
              className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:opacity-95 active:scale-95 transition-all"
            >
              Start Truth or Dare
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // ACTIVE GAME 1: UNO INTERFACE
  // ==========================================
  if (currentGameState.type === 'uno') {
    const uno = currentGameState as UnoState;
    const me = uno.players.find(p => p.userId === user?.id);
    const isMyTurn = uno.currentTurnUser?.userId === user?.id;

    return (
      <div className="rounded-3xl glass-panel border border-white/10 p-6 space-y-6 shadow-2xl relative">
        
        {/* Game Topbar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400 font-display font-bold text-sm">
              UNO
            </span>
            <div>
              <h3 className="font-bold text-white text-base">Multiplayer UNO Match</h3>
              <p className="text-xs text-slate-400">{uno.lastAction}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1 rounded-full bg-dark-900 border border-white/10 text-xs font-mono font-bold text-cyan-400">
              Turn: {uno.currentTurnUser?.username} {isMyTurn ? '(YOU)' : ''}
            </div>
            <button
              onClick={handleResetGame}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
              title="Reset Game"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Winner Banner */}
        {uno.winner && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-center space-y-2 animate-bounce">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
            <h4 className="font-extrabold text-xl text-white">
              🎉 {uno.winner.username} WON THE UNO MATCH!
            </h4>
            <button
              onClick={() => startNewGame('uno')}
              className="px-6 py-2 rounded-xl font-bold text-xs bg-amber-500 text-slate-900 shadow"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Other Players Cards Strip */}
        <div className="flex items-center justify-around py-3 px-4 rounded-2xl bg-dark-900/60 border border-white/5">
          {uno.players.map((p) => {
            const isTurn = p.userId === uno.currentTurnUser?.userId;
            return (
              <div
                key={p.userId}
                className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                  isTurn ? 'border-amber-400 bg-amber-400/10 scale-105' : 'border-transparent'
                }`}
              >
                <span className="text-xs font-bold text-white">{p.username}</span>
                <span className="text-[11px] text-cyan-400 font-mono">{p.cardCount} Cards</span>
                {p.hasCalledUno && (
                  <span className="mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white animate-pulse">
                    UNO!
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Center Arena: Draw Pile & Top Discard */}
        <div className="flex items-center justify-center gap-8 py-6">
          
          {/* Draw Pile */}
          <div
            onClick={isMyTurn ? handleUnoDrawCard : undefined}
            className={`w-24 h-36 rounded-2xl border-2 border-white/20 bg-gradient-to-br from-slate-800 to-dark-950 flex flex-col items-center justify-center cursor-pointer shadow-xl transition-all ${
              isMyTurn ? 'hover:scale-105 border-cyan-400 glow-cyan' : 'opacity-70 cursor-not-allowed'
            }`}
          >
            <span className="font-display font-extrabold text-xl text-white">UNO</span>
            <span className="text-[10px] text-slate-400 mt-1">({uno.deckRemaining})</span>
            {isMyTurn && (
              <span className="mt-2 text-[10px] font-bold text-cyan-300 uppercase">Draw</span>
            )}
          </div>

          {/* Top Discard Card */}
          <div
            className={`w-28 h-40 rounded-2xl border-2 p-3 flex flex-col justify-between shadow-2xl relative ${
              uno.topDiscard.color === 'red' ? 'bg-rose-600 border-rose-300' :
              uno.topDiscard.color === 'blue' ? 'bg-blue-600 border-blue-300' :
              uno.topDiscard.color === 'green' ? 'bg-emerald-600 border-emerald-300' :
              uno.topDiscard.color === 'yellow' ? 'bg-amber-500 border-amber-200 text-slate-900' :
              'bg-gradient-to-tr from-rose-500 via-amber-400 to-blue-500 border-white'
            }`}
          >
            <span className="font-display font-extrabold text-sm">{uno.topDiscard.value.toUpperCase()}</span>
            <div className="self-center font-display font-black text-3xl">
              {uno.topDiscard.value.toUpperCase()}
            </div>
            <span className="self-end font-display font-extrabold text-sm">{uno.topDiscard.value.toUpperCase()}</span>

            {/* Active Color Indicator */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-dark-950 border border-white/20 text-white whitespace-nowrap shadow">
              Color: {uno.activeColor}
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Player's Own Cards Hand */}
        {me && (
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Your Hand ({me.cards.length} cards)</span>
              
              {/* UNO Shout Button */}
              {me.cards.length <= 2 && (
                <button
                  onClick={handleUnoCall}
                  className="px-4 py-1.5 rounded-xl font-display font-black text-xs bg-rose-500 hover:bg-rose-600 text-white shadow-lg animate-pulse"
                >
                  ⚡ SHOUT UNO!
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1">
              {me.cards.map((card) => {
                const isWild = card.color === 'wild';
                const canPlay = isMyTurn && (isWild || card.color === uno.activeColor || card.value === uno.activeValue);

                return (
                  <button
                    key={card.id}
                    disabled={!canPlay}
                    onClick={() => handleUnoPlayCard(card.id, isWild)}
                    className={`w-20 h-28 flex-shrink-0 rounded-xl border-2 p-2 flex flex-col justify-between shadow-lg transition-all ${
                      card.color === 'red' ? 'bg-rose-600 border-rose-300' :
                      card.color === 'blue' ? 'bg-blue-600 border-blue-300' :
                      card.color === 'green' ? 'bg-emerald-600 border-emerald-300' :
                      card.color === 'yellow' ? 'bg-amber-500 border-amber-200 text-slate-900' :
                      'bg-gradient-to-tr from-rose-500 via-amber-400 to-blue-500 border-white'
                    } ${canPlay ? 'hover:-translate-y-2 hover:scale-105 cursor-pointer glow-text' : 'opacity-40 cursor-not-allowed'}`}
                  >
                    <span className="font-display font-bold text-xs">{card.value.toUpperCase()}</span>
                    <span className="self-center font-display font-black text-xl">{card.value.toUpperCase()}</span>
                    <span className="self-end font-display font-bold text-xs">{card.value.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Wild Color Picker Dialog */}
        {wildColorPickerOpen && (
          <div className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm rounded-3xl flex items-center justify-center z-20">
            <div className="p-6 rounded-2xl glass-panel border border-white/20 text-center space-y-4">
              <h4 className="font-bold text-sm text-white">Choose New Active Color:</h4>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSelectWildColor('red')}
                  className="w-14 h-14 rounded-xl bg-rose-600 font-bold text-white shadow-lg hover:scale-110 transition-transform"
                >
                  RED
                </button>
                <button
                  onClick={() => handleSelectWildColor('blue')}
                  className="w-14 h-14 rounded-xl bg-blue-600 font-bold text-white shadow-lg hover:scale-110 transition-transform"
                >
                  BLUE
                </button>
                <button
                  onClick={() => handleSelectWildColor('green')}
                  className="w-14 h-14 rounded-xl bg-emerald-600 font-bold text-white shadow-lg hover:scale-110 transition-transform"
                >
                  GREEN
                </button>
                <button
                  onClick={() => handleSelectWildColor('yellow')}
                  className="w-14 h-14 rounded-xl bg-amber-500 font-bold text-slate-900 shadow-lg hover:scale-110 transition-transform"
                >
                  YELLOW
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // ACTIVE GAME 2: LUDO INTERFACE
  // ==========================================
  if (currentGameState.type === 'ludo') {
    const ludo = currentGameState as LudoState;
    const isMyTurn = ludo.currentTurnUser?.userId === user?.id;
    const me = ludo.players.find(p => p.userId === user?.id);

    return (
      <div className="rounded-3xl glass-panel border border-white/10 p-6 space-y-6 shadow-2xl">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 font-display font-bold text-sm">
              LUDO
            </span>
            <div>
              <h3 className="font-bold text-white text-base">Futuristic 4-Player Ludo</h3>
              <p className="text-xs text-slate-400">{ludo.lastAction}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-dark-900 border border-white/10 text-xs font-mono font-bold text-indigo-300">
              Turn: {ludo.currentTurnUser?.username} ({ludo.currentTurnUser?.color?.toUpperCase()})
            </span>
            <button
              onClick={handleResetGame}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Winner Announcement */}
        {ludo.winner && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 to-indigo-500/20 border border-amber-500/40 text-center space-y-2 animate-bounce">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
            <h4 className="font-extrabold text-xl text-white">
              👑 {ludo.winner.username} WON THE LUDO CHAMPIONSHIP!
            </h4>
            <button
              onClick={() => startNewGame('ludo')}
              className="px-6 py-2 rounded-xl font-bold text-xs bg-amber-500 text-slate-900 shadow"
            >
              Play Again
            </button>
          </div>
        )}

        {/* Players Score Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ludo.players.map((p) => {
            const isTurn = p.userId === ludo.currentTurnUser?.userId;
            const colorClass = 
              p.color === 'red' ? 'text-rose-400 border-rose-500/30' :
              p.color === 'green' ? 'text-emerald-400 border-emerald-500/30' :
              p.color === 'yellow' ? 'text-amber-400 border-amber-500/30' :
              'text-blue-400 border-blue-500/30';

            return (
              <div
                key={p.userId}
                className={`p-3 rounded-2xl bg-white/5 border ${colorClass} ${
                  isTurn ? 'ring-2 ring-indigo-400 shadow-lg scale-102' : ''
                }`}
              >
                <div className="text-xs font-bold truncate">{p.username}</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Home: {p.finishedCount} / 4 Tokens
                </div>
              </div>
            );
          })}
        </div>

        {/* Dice Roller Section */}
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-dark-900/60 border border-white/5 space-y-4">
          <div className="flex items-center gap-6">
            <div className="p-4 rounded-2xl bg-dark-950 border border-white/10 shadow-inner">
              {getDiceIcon(ludo.currentDice)}
            </div>

            {isMyTurn && !ludo.hasRolled && (
              <button
                onClick={handleLudoRollDice}
                className="px-8 py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                Roll Dice
              </button>
            )}

            {isMyTurn && ludo.hasRolled && (
              <span className="text-xs font-bold text-cyan-300">
                Rolled a {ludo.currentDice}! Click a token below to move.
              </span>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Player's Tokens Controller */}
        {me && (
          <div className="space-y-3 pt-3">
            <h4 className="text-xs font-bold text-white">Your Tokens ({me.color.toUpperCase()}):</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {me.tokens.map((token) => {
                const canMove = isMyTurn && ludo.hasRolled && (
                  (token.state === 'YARD' && ludo.currentDice === 6) ||
                  ((token.state === 'TRACK' || token.state === 'HOME_COLUMN') && (token.stepCount + (ludo.currentDice || 0) <= 57))
                );

                return (
                  <button
                    key={token.id}
                    disabled={!canMove}
                    onClick={() => handleLudoMoveToken(token.id)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      canMove
                        ? 'border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 glow-cyan cursor-pointer scale-102'
                        : 'border-white/5 bg-white/5 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">Token #{token.id + 1}</div>
                    <div className="text-[11px] text-slate-400">
                      State: <span className="text-cyan-300 font-semibold">{token.state}</span>
                    </div>
                    {token.stepCount >= 0 && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        Step: {token.stepCount} / 57
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // ACTIVE GAME 3: TRUTH OR DARE INTERFACE
  // ==========================================
  if (currentGameState.type === 'truth_dare') {
    const td = currentGameState as TruthDareState;
    const isSelected = td.selectedPlayer?.userId === user?.id;

    return (
      <div className="rounded-3xl glass-panel border border-white/10 p-6 space-y-6 shadow-2xl">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-pink-500/20 text-pink-400 font-display font-bold text-sm">
              TRUTH OR DARE
            </span>
            <div>
              <h3 className="font-bold text-white text-base">Live Interactive Truth or Dare</h3>
              <p className="text-xs text-slate-400">{td.lastAction}</p>
            </div>
          </div>

          <button
            onClick={handleResetGame}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Players Strip */}
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          {td.players.map((p) => {
            const isTarget = p.userId === td.selectedPlayer?.userId;
            return (
              <div
                key={p.userId}
                className={`px-4 py-2 rounded-2xl border text-center whitespace-nowrap transition-all ${
                  isTarget
                    ? 'border-pink-500 bg-pink-500/20 shadow-lg shadow-pink-500/20 scale-105'
                    : 'border-white/5 bg-white/5'
                }`}
              >
                <div className="font-bold text-xs text-white">{p.username}</div>
                <div className="text-[10px] text-cyan-300 font-mono">{p.score} pts</div>
              </div>
            );
          })}
        </div>

        {/* Arena Center */}
        <div className="p-8 sm:p-12 rounded-2xl bg-dark-900/60 border border-white/5 flex flex-col items-center justify-center text-center space-y-6 min-h-[300px]">
          
          {td.status === 'WAITING_SPIN' && (
            <div className="space-y-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-pink-500/25 animate-pulse">
                <Sparkles className="w-10 h-10" />
              </div>
              <h4 className="font-bold text-lg text-white">Ready for the Next Round</h4>
              <button
                onClick={handleTruthDareSpin}
                className="px-8 py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                🍾 Spin the Bottle
              </button>
            </div>
          )}

          {td.status === 'CHOOSING' && (
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-white">
                Bottle Pointed to <span className="text-pink-400">{td.selectedPlayer?.username}</span>!
              </h4>
              {isSelected ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300">Choose your path:</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => handleTruthDareChoice('TRUTH')}
                      className="px-6 py-3 rounded-2xl font-bold text-sm bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg"
                    >
                      Truth 🗣️
                    </button>
                    <button
                      onClick={() => handleTruthDareChoice('DARE')}
                      className="px-6 py-3 rounded-2xl font-bold text-sm bg-pink-500 hover:bg-pink-600 text-white shadow-lg"
                    >
                      Dare 🔥
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Waiting for {td.selectedPlayer?.username} to pick Truth or Dare...</p>
              )}
            </div>
          )}

          {td.status === 'IN_ACTION' && (
            <div className="space-y-5 max-w-lg">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/30">
                {td.currentMode} Challenge for {td.selectedPlayer?.username}
              </span>

              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-white text-base sm:text-lg font-medium leading-relaxed">
                "{td.currentPrompt}"
              </div>

              {isSelected && (
                <div className="flex items-center justify-center gap-4 pt-2">
                  <button
                    onClick={handleTruthDareSkip}
                    className="px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-400 hover:text-white border border-white/10"
                  >
                    Skip (-0 pts)
                  </button>
                  <button
                    onClick={handleTruthDareComplete}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow"
                  >
                    Challenge Completed (+10 pts)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};
