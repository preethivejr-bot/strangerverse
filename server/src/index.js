import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { ROLES, ROLE_HIERARCHY, TAMIL_NADU_DISTRICTS } from './constants.js';
import { store } from './store.js';
import { verifyUserToken, setFirebaseCustomRole } from './firebase.js';
import { moderationEngine } from './moderationEngine.js';
import { UnoGame } from './gameEngines/unoEngine.js';
import { LudoGame } from './gameEngines/ludoEngine.js';
import { TruthDareGame } from './gameEngines/truthDareEngine.js';
import { saveReportToSupabase } from './supabase.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(clientDist));

const PORT = process.env.PORT || 5000;
const OWNER_EMAIL = (process.env.OWNER_EMAIL || '').trim().toLowerCase();

console.log(`[Config] Configured OWNER_EMAIL: ${OWNER_EMAIL ? OWNER_EMAIL : '(None configured - Owner role will not be automatically given)'}`);

// Start auto-moderation engine
moderationEngine.start(io);

// Helper to determine role safely on login
function resolveUserRole(email, existingUser = null) {
  const cleanEmail = (email || '').trim().toLowerCase();
  
  // If OWNER_EMAIL is configured and matches, user ALWAYS receives OWNER (Super Manager)
  if (OWNER_EMAIL && cleanEmail === OWNER_EMAIL) {
    return ROLES.OWNER;
  }

  // Preserve existing assigned roles if not owner
  if (existingUser && existingUser.role) {
    if (existingUser.role === ROLES.OWNER) {
      // If someone previously had OWNER but email no longer matches configured OWNER_EMAIL, demote to NORMAL_USER
      if (!OWNER_EMAIL || cleanEmail !== OWNER_EMAIL) {
        return ROLES.NORMAL_USER;
      }
    }
    return existingUser.role;
  }

  // Default role is NORMAL_USER
  return ROLES.NORMAL_USER;
}

// Root and Health endpoints for cloud load balancers, Render, and uptime monitors
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'StrangerVerse Real-time Server',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'StrangerVerse Real-time Server',
    time: new Date().toISOString(),
    ownerConfigured: Boolean(OWNER_EMAIL),
    fastModeratorMode: store.fastModeratorMode
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    appName: 'STRANGERVERSE',
    tagline: 'Meet Strangers. Connect Locally. Play Together.',
    districts: TAMIL_NADU_DISTRICTS,
    ownerEmailConfigured: Boolean(OWNER_EMAIL),
    fastModeratorMode: store.fastModeratorMode,
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' }
    ]
  });
});

// All 10 District Junctions summary endpoint
app.get('/api/junctions', (req, res) => {
  res.json(store.getAllJunctionsSummary());
});

// Authentication verify endpoint
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { token, user: clientUser } = req.body;
    const verified = await verifyUserToken(token, clientUser);

    if (!verified || !verified.email) {
      return res.status(400).json({ error: 'Invalid authentication credentials.' });
    }

    let existing = store.getUserByEmail(verified.email);
    const assignedRole = resolveUserRole(verified.email, existing);

    const user = {
      id: existing ? existing.id : verified.uid,
      email: verified.email,
      displayName: verified.displayName || 'Stranger',
      photoURL: verified.photoURL,
      role: assignedRole,
      status: 'online',
      isMuted: existing?.isMuted || false,
      isBanned: existing?.isBanned || false,
      isSuspended: existing?.isSuspended || false,
      registeredAt: existing ? existing.registeredAt : Date.now(),
      lastActive: Date.now()
    };

    store.saveUser(user);
    await setFirebaseCustomRole(user.id, user.role);

    res.json({ success: true, user });
  } catch (error) {
    console.error('/api/auth/verify error:', error);
    res.status(500).json({ error: 'Server authentication failure.' });
  }
});

// Owner Control Center Statistics
app.get('/api/owner/stats', (req, res) => {
  const allUsers = store.getAllUsers();
  const onlineCount = allUsers.filter(u => u.status === 'online').length;
  const managersCount = allUsers.filter(u => u.role === ROLES.MANAGER).length;
  const moderatorsCount = allUsers.filter(u => u.role === ROLES.MODERATOR).length;
  const activeJunctions = Array.from(store.junctions.values()).filter(j => j.participants.length > 0).length;
  const activeSessions = store.active1on1Chats.size;
  const pendingReports = store.reports.filter(r => r.status === 'PENDING').length;

  res.json({
    totalUsers: allUsers.length,
    onlineUsers: onlineCount,
    totalManagers: managersCount,
    totalModerators: moderatorsCount,
    activeJunctions,
    active1on1Sessions: activeSessions,
    pendingReports,
    fastModeratorMode: store.fastModeratorMode
  });
});

// List Users (Restricted to Owner and Managers)
app.get('/api/owner/users', (req, res) => {
  const requesterEmail = (req.headers['x-requester-email'] || '').trim().toLowerCase();
  const requester = store.getUserByEmail(requesterEmail);

  if (!requester || (requester.role !== ROLES.OWNER && requester.role !== ROLES.MANAGER)) {
    return res.status(403).json({ error: 'Access Denied: Owner or Manager credentials required.' });
  }

  const isOwner = requester.role === ROLES.OWNER;
  const users = store.getAllUsers().map(u => ({
    id: u.id,
    displayName: u.displayName,
    // Only owner sees real email addresses for privacy protection
    email: isOwner ? u.email : u.email.replace(/(.{2})(.*)(?=@)/, '$1***'),
    photoURL: u.photoURL,
    role: u.role,
    status: u.status,
    isBanned: Boolean(u.isBanned),
    isSuspended: Boolean(u.isSuspended),
    registeredAt: u.registeredAt,
    lastActive: u.lastActive
  }));

  res.json({ users });
});

// Role Management (Owner Controlled)
app.post('/api/owner/role', (req, res) => {
  const requesterEmail = (req.headers['x-requester-email'] || '').trim().toLowerCase();
  const requester = store.getUserByEmail(requesterEmail);
  const { targetUserId, newRole, action } = req.body;

  if (!requester) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const target = store.getUser(targetUserId);
  if (!target) {
    return res.status(404).json({ error: 'Target user not found.' });
  }

  // Nobody can change their own role!
  if (requester.id === target.id) {
    return res.status(400).json({ error: 'You cannot alter your own role.' });
  }

  // The Original Owner is PERMANENTLY PROTECTED
  if (target.role === ROLES.OWNER) {
    return res.status(403).json({ error: 'Action Forbidden: The Original Website Owner cannot be modified, demoted, or banned!' });
  }

  // Level 1: OWNER has supreme authority
  // Level 2: MANAGER can only appoint/remove MODERATOR if granted, never MANAGER or OWNER
  if (requester.role === ROLES.MANAGER) {
    if (newRole === ROLES.MANAGER || newRole === ROLES.OWNER) {
      return res.status(403).json({ error: 'Managers cannot appoint other Managers or Owners.' });
    }
    if (target.role === ROLES.MANAGER) {
      return res.status(403).json({ error: 'Managers cannot modify another Manager.' });
    }
  } else if (requester.role !== ROLES.OWNER) {
    return res.status(403).json({ error: 'Only the Original Owner or authorized Managers can manage roles.' });
  }

  const oldRole = target.role;

  // Execute action
  if (action === 'BAN_USER') {
    target.isBanned = true;
    target.status = 'banned';
    store.logAudit(requester, 'BAN_USER', `Permanently banned ${target.displayName} (${target.email})`, target.id);
  } else if (action === 'UNBAN_USER') {
    target.isBanned = false;
    target.status = 'offline';
    store.logAudit(requester, 'UNBAN_USER', `Unbanned ${target.displayName}`, target.id);
  } else if (action === 'SUSPEND_USER') {
    target.isSuspended = true;
    store.logAudit(requester, 'SUSPEND_USER', `Temporarily suspended ${target.displayName}`, target.id);
  } else {
    // Valid roles: MANAGER, MODERATOR, NORMAL_USER
    if (!Object.values(ROLES).includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role specified.' });
    }
    target.role = newRole;
    store.logAudit(requester, 'CHANGE_ROLE', `Changed role of ${target.displayName} from ${oldRole} to ${newRole}`, target.id);
  }

  store.saveUser(target);
  setFirebaseCustomRole(target.id, target.role);

  // Notify target user via socket if connected
  io.emit('user:role-updated', {
    userId: target.id,
    newRole: target.role,
    isBanned: target.isBanned,
    isSuspended: target.isSuspended
  });

  res.json({ success: true, user: target });
});

// Audit Logs
app.get('/api/owner/audit-logs', (req, res) => {
  const requesterEmail = (req.headers['x-requester-email'] || '').trim().toLowerCase();
  const requester = store.getUserByEmail(requesterEmail);

  if (!requester || requester.role !== ROLES.OWNER) {
    return res.status(403).json({ error: 'Only the Original Website Owner can view administrative audit logs.' });
  }

  res.json({ logs: store.auditLogs });
});

// User Reports
app.post('/api/reports', (req, res) => {
  const { reporterId, reportedUserId, reason, details, context } = req.body;
  const reporter = store.getUser(reporterId);
  const reported = store.getUser(reportedUserId);

  const report = {
    id: `rep_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    reporterId,
    reporterName: reporter?.displayName || 'Anonymous',
    reportedUserId,
    reportedName: reported?.displayName || 'Unknown',
    reason,
    details: details || '',
    context: context || 'General',
    status: 'PENDING',
    timestamp: Date.now()
  };

  store.reports.push(report);
  saveReportToSupabase(report);
  store.logAudit(reporter, 'SUBMIT_REPORT', `Report submitted against ${report.reportedName} for "${reason}"`, reportedUserId);

  res.json({ success: true, reportId: report.id });
});

app.get('/api/owner/reports', (req, res) => {
  res.json({ reports: store.reports });
});

// Dev Toggle for fast testing auto-moderator promotion (20 seconds vs 10 minutes)
app.post('/api/dev/toggle-fast-automod', (req, res) => {
  store.fastModeratorMode = !store.fastModeratorMode;
  res.json({ fastModeratorMode: store.fastModeratorMode });
});

// ==========================================
// SOCKET.IO REAL-TIME EVENT HANDLERS
// ==========================================

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // User Authentication Handshake
  socket.on('auth:register', (clientUser) => {
    if (!clientUser || !clientUser.email) return;

    let existing = store.getUserByEmail(clientUser.email);
    const assignedRole = resolveUserRole(clientUser.email, existing);

    const user = {
      id: existing ? existing.id : (clientUser.id || clientUser.uid || `u_${Date.now()}`),
      email: clientUser.email.trim().toLowerCase(),
      displayName: clientUser.displayName || 'Stranger',
      photoURL: clientUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${clientUser.displayName || 'stranger'}`,
      role: assignedRole,
      status: 'online',
      socketId: socket.id,
      registeredAt: existing ? existing.registeredAt : Date.now(),
      lastActive: Date.now()
    };

    store.saveUser(user);
    store.socketToUser.set(socket.id, user.id);

    socket.emit('auth:verified', user);
    io.emit('users:count', store.getAllUsers().filter(u => u.status === 'online').length);
  });

  // ------------------------------------------
  // 1-ON-1 RANDOM STRANGER VOICE CHAT
  // ------------------------------------------
  socket.on('voice:join-queue', (userData) => {
    const userId = store.socketToUser.get(socket.id) || userData.id;
    const user = store.getUser(userId) || userData;

    // Remove from existing queue if already present
    store.voiceQueue = store.voiceQueue.filter(entry => entry.socketId !== socket.id && entry.userId !== userId);

    // Check if another stranger is waiting
    if (store.voiceQueue.length > 0) {
      const peer = store.voiceQueue.shift();
      const sessionId = `vcall_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      store.active1on1Chats.set(sessionId, {
        type: 'voice',
        p1: { socketId: peer.socketId, userId: peer.userId, user: peer.user },
        p2: { socketId: socket.id, userId: user.id, user },
        startedAt: Date.now()
      });

      // Peer 1 is caller (initiator), Peer 2 is receiver
      io.to(peer.socketId).emit('voice:matched', {
        sessionId,
        isInitiator: true,
        stranger: { id: user.id, displayName: user.displayName, photoURL: user.photoURL }
      });

      socket.emit('voice:matched', {
        sessionId,
        isInitiator: false,
        stranger: { id: peer.user.id, displayName: peer.user.displayName, photoURL: peer.user.photoURL }
      });

      console.log(`[Voice Match] Paired ${peer.user.displayName} with ${user.displayName}`);
    } else {
      store.voiceQueue.push({ socketId: socket.id, userId, user });
      socket.emit('voice:searching', { status: 'Searching for a stranger with mic active...' });
    }
  });

  socket.on('voice:signal', ({ sessionId, targetSocketId, signal }) => {
    // Relay WebRTC SDP offer, answer, or ICE candidate to the other peer
    const session = store.active1on1Chats.get(sessionId);
    if (!session) return;

    const recipientSocket = session.p1.socketId === socket.id ? session.p2.socketId : session.p1.socketId;
    io.to(recipientSocket).emit('voice:signal', { sessionId, signal });
  });

  socket.on('voice:leave', ({ sessionId }) => {
    cleanup1on1Session(sessionId, socket.id, 'voice');
  });

  // ------------------------------------------
  // 1-ON-1 RANDOM STRANGER TEXT CHAT
  // ------------------------------------------
  socket.on('text:join-queue', (userData) => {
    const userId = store.socketToUser.get(socket.id) || userData.id;
    const user = store.getUser(userId) || userData;

    // Filter out if already in queue
    store.textQueue = store.textQueue.filter(entry => entry.socketId !== socket.id && entry.userId !== userId);

    if (store.textQueue.length > 0) {
      const peer = store.textQueue.shift();
      const sessionId = `tchat_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      store.active1on1Chats.set(sessionId, {
        type: 'text',
        p1: { socketId: peer.socketId, userId: peer.userId, user: peer.user },
        p2: { socketId: socket.id, userId: user.id, user },
        startedAt: Date.now()
      });

      io.to(peer.socketId).emit('text:matched', {
        sessionId,
        stranger: { id: user.id, displayName: user.displayName, photoURL: user.photoURL }
      });

      socket.emit('text:matched', {
        sessionId,
        stranger: { id: peer.user.id, displayName: peer.user.displayName, photoURL: peer.user.photoURL }
      });

      console.log(`[Text Match] Paired ${peer.user.displayName} with ${user.displayName}`);
    } else {
      store.textQueue.push({ socketId: socket.id, userId, user });
      socket.emit('text:searching', { status: 'Searching for an online stranger to chat...' });
    }
  });

  socket.on('text:message', ({ sessionId, text }) => {
    const session = store.active1on1Chats.get(sessionId);
    if (!session) return;

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      senderSocketId: socket.id,
      text,
      timestamp: Date.now()
    };

    io.to(session.p1.socketId).emit('text:message', message);
    io.to(session.p2.socketId).emit('text:message', message);
  });

  socket.on('text:typing', ({ sessionId, isTyping }) => {
    const session = store.active1on1Chats.get(sessionId);
    if (!session) return;

    const targetSocket = session.p1.socketId === socket.id ? session.p2.socketId : session.p1.socketId;
    io.to(targetSocket).emit('text:typing', { isTyping });
  });

  socket.on('text:leave', ({ sessionId }) => {
    cleanup1on1Session(sessionId, socket.id, 'text');
  });

  function cleanup1on1Session(sessionId, leavingSocketId, type) {
    const session = store.active1on1Chats.get(sessionId);
    if (!session) return;

    const peerSocket = session.p1.socketId === leavingSocketId ? session.p2.socketId : session.p1.socketId;
    io.to(peerSocket).emit(`${type}:stranger-disconnected`, {
      message: 'Stranger has disconnected from the conversation.'
    });

    store.active1on1Chats.delete(sessionId);
  }

  // ------------------------------------------
  // TAMIL NADU DISTRICT JUNCTIONS (ROOM CAPACITY & REAL-TIME COMMS)
  // ------------------------------------------
  socket.on('junctions:get-all', () => {
    socket.emit('junctions:updated', store.getAllJunctionsSummary());
  });

  socket.on('junction:join', ({ districtId, user: clientUser }) => {
    const userId = store.socketToUser.get(socket.id) || clientUser.id;
    const user = store.getUser(userId) || clientUser;

    if (!user || user.isBanned) {
      return socket.emit('junction:join-error', { error: 'Your account is currently restricted from joining junctions.' });
    }

    // Atomic join with strict max capacity check
    const result = store.joinJunction(districtId, user, socket.id);
    if (!result.success) {
      return socket.emit('junction:join-error', { error: result.error });
    }

    socket.join(`junction_${districtId}`);

    // Notify room of new participant
    io.to(`junction_${districtId}`).emit('junction:user-joined', {
      districtId,
      participant: result.participant,
      message: `${user.displayName} entered ${result.junction.name} Junction.`
    });

    // Send complete current room state to joining client
    socket.emit('junction:joined-success', {
      districtId,
      junction: {
        id: result.junction.id,
        name: result.junction.name,
        tagline: result.junction.tagline,
        landmark: result.junction.landmark,
        accentColor: result.junction.accentColor,
        maxCapacity: result.junction.maxCapacity,
        activeModeratorId: result.junction.activeModeratorId,
        participants: result.junction.participants,
        messages: result.junction.messages.slice(-50),
        activeGame: store.junctionGames.get(districtId)?.getState() || null
      }
    });

    // Broadcast updated counts to all users browsing junctions
    io.emit('junctions:updated', store.getAllJunctionsSummary());
  });

  socket.on('junction:leave', ({ districtId }) => {
    const userId = store.socketToUser.get(socket.id);
    if (!userId) return;

    const result = store.leaveJunction(districtId, userId);
    if (result) {
      socket.leave(`junction_${districtId}`);
      io.to(`junction_${districtId}`).emit('junction:user-left', {
        districtId,
        userId,
        username: result.participant.username
      });
      io.emit('junctions:updated', store.getAllJunctionsSummary());
    }
  });

  socket.on('junction:message', ({ districtId, text }) => {
    const userId = store.socketToUser.get(socket.id);
    const user = store.getUser(userId);
    const junction = store.getJunction(districtId);

    if (!user || !junction || !text || text.trim().length === 0) return;

    const participant = junction.participants.find(p => p.userId === userId);
    if (!participant) return;

    const message = {
      id: `jmsg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: user.id,
      username: user.displayName,
      photoURL: user.photoURL,
      userRole: participant.role || user.role,
      text: text.trim().slice(0, 500),
      timestamp: Date.now()
    };

    junction.messages.push(message);
    if (junction.messages.length > 100) junction.messages.shift();

    io.to(`junction_${districtId}`).emit('junction:message', { districtId, message });
  });

  // Junction Voice Chat WebRTC signaling
  socket.on('junction:voice-signal', ({ districtId, targetSocketId, signal }) => {
    io.to(targetSocketId).emit('junction:voice-signal', {
      districtId,
      senderSocketId: socket.id,
      signal
    });
  });

  socket.on('junction:mic-state', ({ districtId, isMicOn }) => {
    const junction = store.getJunction(districtId);
    if (!junction) return;

    const participant = junction.participants.find(p => p.socketId === socket.id);
    if (participant) {
      if (participant.isMutedByMod && isMicOn) {
        socket.emit('junction:error', { message: 'You have been muted by a moderator and cannot unmute.' });
        return;
      }
      participant.isMicOn = isMicOn;
      io.to(`junction_${districtId}`).emit('junction:mic-state-changed', {
        districtId,
        userId: participant.userId,
        isMicOn
      });
    }
  });

  // Moderator / Owner action: Kick user from junction
  socket.on('junction:kick-participant', ({ districtId, targetUserId }) => {
    const actorId = store.socketToUser.get(socket.id);
    const actor = store.getUser(actorId);
    const junction = store.getJunction(districtId);

    if (!actor || !junction) return;

    // Check if actor has permission (Owner, Manager, or Room Moderator)
    const isOwner = actor.role === ROLES.OWNER;
    const isManager = actor.role === ROLES.MANAGER;
    const isRoomMod = junction.activeModeratorId === actor.id || actor.role === ROLES.MODERATOR;

    if (!isOwner && !isManager && !isRoomMod) {
      return socket.emit('junction:error', { message: 'Only moderators or managers can remove members.' });
    }

    const result = store.kickParticipant(districtId, targetUserId, actor);
    if (!result.success) {
      return socket.emit('junction:error', { message: result.error });
    }

    // Notify the kicked socket
    io.to(result.removedSocketId).emit('junction:you-were-kicked', {
      message: `You were removed from ${junction.name} Junction by moderator ${actor.displayName}. (3 min cooldown)`
    });

    // Notify the room
    io.to(`junction_${districtId}`).emit('junction:user-kicked', {
      districtId,
      targetUserId,
      moderatorName: actor.displayName
    });

    io.emit('junctions:updated', store.getAllJunctionsSummary());
  });

  // Moderator / Owner action: Mute user in junction
  socket.on('junction:mute-participant', ({ districtId, targetUserId, isMuted }) => {
    const actorId = store.socketToUser.get(socket.id);
    const actor = store.getUser(actorId);
    const junction = store.getJunction(districtId);

    if (!actor || !junction) return;

    const isOwner = actor.role === ROLES.OWNER;
    const isManager = actor.role === ROLES.MANAGER;
    const isRoomMod = junction.activeModeratorId === actor.id || actor.role === ROLES.MODERATOR;

    if (!isOwner && !isManager && !isRoomMod) {
      return socket.emit('junction:error', { message: 'Only moderators or managers can mute members.' });
    }

    const result = store.toggleParticipantMute(districtId, targetUserId, actor, isMuted);
    if (!result.success) {
      return socket.emit('junction:error', { message: result.error });
    }

    io.to(`junction_${districtId}`).emit('junction:user-mute-toggled', {
      districtId,
      targetUserId,
      isMuted
    });
  });

  // ------------------------------------------
  // MULTIPLAYER GAMES (UNO, LUDO, TRUTH OR DARE)
  // ------------------------------------------
  function checkAndRunBotTurn(districtId, game) {
    if (!game || game.status !== 'IN_PROGRESS') return;
    const current = game.getCurrentPlayer();
    if (current && current.isBot) {
      setTimeout(() => {
        const g = store.junctionGames.get(districtId);
        if (!g || g.status !== 'IN_PROGRESS') return;
        const curr = g.getCurrentPlayer();
        if (curr && curr.isBot && typeof g.playBotTurn === 'function') {
          g.playBotTurn();
          io.to(`junction_${districtId}`).emit('game:updated', {
            districtId,
            gameState: g.getState()
          });
          checkAndRunBotTurn(districtId, g);
        }
      }, 1300);
    }
  }

  socket.on('game:join-arena', ({ districtId }) => {
    socket.join(`junction_${districtId}`);
    const existing = store.junctionGames.get(districtId);
    if (existing) {
      socket.emit('game:updated', {
        districtId,
        gameState: existing.getState()
      });
    }
  });

  socket.on('game:start', ({ districtId, gameType, playerIds }) => {
    socket.join(`junction_${districtId}`);
    const junction = store.getJunction(districtId);
    let selectedParticipants = [];

    if (junction && junction.participants && junction.participants.length > 0) {
      selectedParticipants = junction.participants.filter(p => playerIds && playerIds.includes(p.userId));
    }

    if (selectedParticipants.length === 0) {
      const uId = store.socketToUser.get(socket.id) || (playerIds && playerIds[0]) || 'player_1';
      const u = store.getUser(uId);
      selectedParticipants.push({
        userId: uId,
        username: u?.displayName || 'Player 1'
      });
    }

    // Auto-fill with intelligent AI Bots if fewer than 2 human players
    if (selectedParticipants.length === 1 && (gameType === 'uno' || gameType === 'ludo')) {
      selectedParticipants.push({
        userId: 'bot_karthik',
        username: 'Karthik (AI)',
        isBot: true
      });
      if (gameType === 'uno') {
        selectedParticipants.push({
          userId: 'bot_ananya',
          username: 'Ananya (AI)',
          isBot: true
        });
      }
    }

    let game;
    if (gameType === 'uno') {
      game = new UnoGame(districtId, selectedParticipants);
    } else if (gameType === 'ludo') {
      game = new LudoGame(districtId, selectedParticipants.slice(0, 4));
    } else if (gameType === 'truth_dare') {
      game = new TruthDareGame(districtId, selectedParticipants.length > 0 ? selectedParticipants : (junction ? junction.participants : selectedParticipants));
    }

    store.junctionGames.set(districtId, game);
    io.to(`junction_${districtId}`).emit('game:updated', {
      districtId,
      gameState: game.getState()
    });

    checkAndRunBotTurn(districtId, game);
  });

  socket.on('game:action', ({ districtId, actionType, payload = {} }) => {
    const game = store.junctionGames.get(districtId);
    if (!game) return;

    const currentTurn = game.getCurrentPlayer ? game.getCurrentPlayer() : null;
    const userId = store.socketToUser.get(socket.id) || payload.userId || (currentTurn && !currentTurn.isBot ? currentTurn.userId : null);
    if (!userId) {
      return socket.emit('game:error', { message: 'Player session not identified. Please sign in.' });
    }

    let result = { error: 'Unknown action' };

    if (game.type === 'uno' || game instanceof UnoGame) {
      if (actionType === 'PLAY_CARD') {
        result = game.playCard(userId, payload.cardId, payload.chosenWildColor);
      } else if (actionType === 'DRAW_CARD') {
        result = game.drawCard(userId);
      } else if (actionType === 'CALL_UNO') {
        result = game.callUno(userId);
      }
    } else if (game.type === 'ludo' || game instanceof LudoGame) {
      if (actionType === 'ROLL_DICE') {
        result = game.rollDice(userId);
      } else if (actionType === 'MOVE_TOKEN') {
        result = game.moveToken(userId, payload.tokenId);
      }
    } else if (game.type === 'truth_dare' || game instanceof TruthDareGame) {
      if (actionType === 'SPIN_BOTTLE') {
        result = game.spinBottle();
      } else if (actionType === 'CHOOSE_MODE') {
        result = game.chooseMode(userId, payload.mode);
      } else if (actionType === 'COMPLETE_TURN') {
        result = game.completeTurn(userId);
      } else if (actionType === 'SKIP_TURN') {
        result = game.skipTurn(userId);
      }
    }

    if (result.error) {
      socket.emit('game:error', { message: result.error });
    } else {
      io.to(`junction_${districtId}`).emit('game:updated', {
        districtId,
        gameState: game.getState()
      });
      checkAndRunBotTurn(districtId, game);
    }
  });

  socket.on('game:reset', ({ districtId }) => {
    store.junctionGames.delete(districtId);
    io.to(`junction_${districtId}`).emit('game:updated', {
      districtId,
      gameState: null
    });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    const userId = store.socketToUser.get(socket.id);
    if (userId) {
      const user = store.getUser(userId);
      if (user) {
        user.status = 'offline';
        user.lastActive = Date.now();
      }
      store.socketToUser.delete(socket.id);
    }

    // Clean up queues
    store.voiceQueue = store.voiceQueue.filter(entry => entry.socketId !== socket.id);
    store.textQueue = store.textQueue.filter(entry => entry.socketId !== socket.id);

    // Clean up 1-on-1 sessions
    for (const [sessionId, session] of store.active1on1Chats.entries()) {
      if (session.p1.socketId === socket.id || session.p2.socketId === socket.id) {
        cleanup1on1Session(sessionId, socket.id, session.type);
      }
    }

    // Clean up junctions
    for (const [districtId, junction] of store.junctions.entries()) {
      const pIndex = junction.participants.findIndex(p => p.socketId === socket.id);
      if (pIndex !== -1) {
        const removed = junction.participants.splice(pIndex, 1)[0];
        if (junction.activeModeratorId === removed.userId) {
          junction.activeModeratorId = null;
        }
        io.to(`junction_${districtId}`).emit('junction:user-left', {
          districtId,
          userId: removed.userId,
          username: removed.username
        });
        io.emit('junctions:updated', store.getAllJunctionsSummary());
      }
    }

    io.emit('users:count', store.getAllUsers().filter(u => u.status === 'online').length);
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// Single Page Application Fallback Route for React Router / client routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  res.status(200).json({
    status: 'ONLINE',
    service: 'StrangerVerse Backend Engine',
    message: 'Backend is active. Frontend is deployed on Vercel.'
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 STRANGERVERSE BACKEND ENGINE LIVE ON PORT ${PORT} (0.0.0.0)`);
  console.log(`⚡ Tagline: Meet Strangers. Connect Locally. Play Together.`);
  console.log(`🛡️ Owner Email: ${OWNER_EMAIL || 'NOT SET'}`);
  console.log(`====================================================`);
});
