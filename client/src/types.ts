export type Role = 'OWNER' | 'MANAGER' | 'MODERATOR' | 'NORMAL_USER';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: Role;
  status: 'online' | 'offline' | 'banned';
  isMuted?: boolean;
  isBanned?: boolean;
  isSuspended?: boolean;
  registeredAt?: number;
  lastActive?: number;
}

export interface JunctionSummary {
  id: string;
  name: string;
  tagline: string;
  landmark: string;
  accentColor: string;
  tags: string[];
  currentCount: number;
  maxCapacity: number;
  activeModeratorId: string | null;
  participants: {
    userId: string;
    username: string;
    photoURL?: string;
    role: Role;
    isMicOn: boolean;
    isMutedByMod: boolean;
    stayDurationMs: number;
  }[];
}

export interface JunctionMessage {
  id: string;
  userId?: string;
  username?: string;
  photoURL?: string;
  userRole?: Role;
  text: string;
  timestamp: number;
  system?: boolean;
}

export interface ChatMessage1on1 {
  id: string;
  senderSocketId: string;
  text: string;
  timestamp: number;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  details: string;
  targetUserId?: string | null;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedName: string;
  reason: string;
  details: string;
  context: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  timestamp: number;
}

// Uno Types
export interface UnoCard {
  id: string;
  color: 'red' | 'blue' | 'green' | 'yellow' | 'wild';
  value: string;
  hidden?: boolean;
}

export interface UnoState {
  type: 'uno';
  junctionId: string;
  status: 'IN_PROGRESS' | 'FINISHED';
  winner: { userId: string; username: string } | null;
  currentTurnIndex: number;
  currentTurnUser: { userId: string; username: string } | null;
  direction: number;
  activeColor: string;
  activeValue: string;
  topDiscard: UnoCard;
  deckRemaining: number;
  lastAction: string;
  players: {
    userId: string;
    username: string;
    cardCount: number;
    hasCalledUno: boolean;
    cards: UnoCard[];
  }[];
}

// Ludo Types
export interface LudoToken {
  id: number;
  state: 'YARD' | 'TRACK' | 'HOME_COLUMN' | 'FINISHED';
  stepCount: number;
  trackPos: number;
}

export interface LudoPlayer {
  userId: string;
  username: string;
  color: 'red' | 'green' | 'yellow' | 'blue';
  tokens: LudoToken[];
  finishedCount: number;
}

export interface LudoState {
  type: 'ludo';
  junctionId: string;
  status: 'IN_PROGRESS' | 'FINISHED';
  winner: { userId: string; username: string; color: string } | null;
  currentTurnIndex: number;
  currentTurnUser: { userId: string; username: string; color: string } | null;
  currentDice: number | null;
  hasRolled: boolean;
  lastAction: string;
  safeSquares: number[];
  players: LudoPlayer[];
}

// Truth or Dare Types
export interface TruthDareState {
  type: 'truth_dare';
  junctionId: string;
  status: 'WAITING_SPIN' | 'CHOOSING' | 'IN_ACTION' | 'COMPLETED';
  selectedPlayer: { userId: string; username: string } | null;
  currentMode: 'TRUTH' | 'DARE' | null;
  currentPrompt: string | null;
  lastAction: string;
  players: {
    userId: string;
    username: string;
    score: number;
  }[];
}

export type ActiveGameState = UnoState | LudoState | TruthDareState;
