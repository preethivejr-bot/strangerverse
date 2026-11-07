import { TAMIL_NADU_DISTRICTS, ROLES, ROLE_HIERARCHY } from './constants.js';
import { syncUserToSupabase, saveAuditLogToSupabase } from './supabase.js';

class CentralStore {
  constructor() {
    this.users = new Map(); // userId -> User
    this.socketToUser = new Map(); // socketId -> userId
    this.junctions = new Map(); // districtId -> JunctionRoom
    this.voiceQueue = []; // array of { socketId, userId, user }
    this.textQueue = []; // array of { socketId, userId, user }
    this.active1on1Chats = new Map(); // sessionId -> { type, p1: {socketId, userId}, p2: {socketId, userId}, startedAt }
    this.junctionGames = new Map(); // junctionId -> GameState
    this.reports = [];
    this.auditLogs = [];
    this.fastModeratorMode = false; // Dev toggle for fast testing

    this.initJunctions();
  }

  initJunctions() {
    for (const district of TAMIL_NADU_DISTRICTS) {
      this.junctions.set(district.id, {
        id: district.id,
        name: district.name,
        tagline: district.tagline,
        description: district.description,
        landmark: district.landmark,
        accentColor: district.accentColor,
        tags: district.tags,
        maxCapacity: district.maxCapacity, // 10
        participants: [], // array of participant objects
        activeModeratorId: null,
        temporaryBans: new Map(), // userId -> expiryTimestamp
        messages: [
          {
            id: `msg_welcome_${district.id}`,
            system: true,
            text: `Welcome to ${district.name} Junction! Respect community guidelines and connect with locals.`,
            timestamp: Date.now()
          }
        ]
      });
    }

    // Global gaming arena for /games page
    this.junctions.set('global_arena', {
      id: 'global_arena',
      name: 'Global Gaming Arena',
      tagline: 'Multiplayer UNO, Ludo, and Truth or Dare',
      description: 'Global tables for social multiplayer gaming',
      landmark: 'StrangerVerse Arena',
      accentColor: '#8B5CF6',
      tags: ['Games', 'Multiplayer', 'UNO', 'Ludo'],
      maxCapacity: 100,
      participants: [],
      activeModeratorId: null,
      temporaryBans: new Map(),
      messages: []
    });
  }

  // User management
  getUser(userId) {
    return this.users.get(userId);
  }

  getUserByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email && user.email.toLowerCase() === cleanEmail) {
        return user;
      }
    }
    return null;
  }

  saveUser(user) {
    this.users.set(user.id, user);
    syncUserToSupabase(user);
    return user;
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  logAudit(actor, action, details, targetUserId = null) {
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: Date.now(),
      actorId: actor?.id || 'SYSTEM',
      actorName: actor?.displayName || 'SYSTEM',
      actorRole: actor?.role || 'SYSTEM',
      action,
      details,
      targetUserId
    };
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
    saveAuditLogToSupabase(entry);
    console.log(`[AUDIT] ${entry.actorName} (${entry.actorRole}) -> ${action}: ${details}`);
    return entry;
  }

  // Junction operations
  getJunction(districtId) {
    return this.junctions.get(districtId);
  }

  getAllJunctionsSummary() {
    return Array.from(this.junctions.values()).map(j => ({
      id: j.id,
      name: j.name,
      tagline: j.tagline,
      landmark: j.landmark,
      accentColor: j.accentColor,
      tags: j.tags,
      currentCount: j.participants.length,
      maxCapacity: j.maxCapacity,
      activeModeratorId: j.activeModeratorId,
      participants: j.participants.map(p => ({
        userId: p.userId,
        username: p.username,
        photoURL: p.photoURL,
        role: p.role,
        isMicOn: p.isMicOn,
        isMutedByMod: p.isMutedByMod,
        stayDurationMs: Date.now() - p.joinedAt
      }))
    }));
  }

  // Atomic Junction Entry Lock: prevents 11th user
  joinJunction(districtId, user, socketId) {
    const junction = this.junctions.get(districtId);
    if (!junction) {
      return { success: false, error: 'Junction does not exist.' };
    }

    // Check temporary ban/kick cooldown
    const banExpiry = junction.temporaryBans.get(user.id);
    if (banExpiry && Date.now() < banExpiry) {
      const waitSeconds = Math.ceil((banExpiry - Date.now()) / 1000);
      return { success: false, error: `You were removed by a moderator. Rejoin allowed in ${waitSeconds}s.` };
    }

    // Check if already inside
    const existingIndex = junction.participants.findIndex(p => p.userId === user.id);
    if (existingIndex !== -1) {
      // Re-attach socketId
      junction.participants[existingIndex].socketId = socketId;
      return { success: true, junction, participant: junction.participants[existingIndex] };
    }

    // Atomic capacity check: max 10 users!
    if (junction.participants.length >= junction.maxCapacity) {
      return { success: false, error: `Junction is full (${junction.participants.length}/${junction.maxCapacity} users). Please try again when someone leaves.` };
    }

    const participant = {
      userId: user.id,
      socketId,
      username: user.displayName,
      photoURL: user.photoURL,
      role: user.role,
      joinedAt: Date.now(),
      isMicOn: false,
      isMutedByMod: false
    };

    junction.participants.push(participant);
    return { success: true, junction, participant };
  }

  leaveJunction(districtId, userId) {
    const junction = this.junctions.get(districtId);
    if (!junction) return null;

    const index = junction.participants.findIndex(p => p.userId === userId);
    if (index === -1) return null;

    const [removed] = junction.participants.splice(index, 1);

    // If leaving user was active moderator, reset it so auto-promotion engine can promote next
    if (junction.activeModeratorId === userId) {
      junction.activeModeratorId = null;
    }

    return { junction, participant: removed };
  }

  kickParticipant(districtId, targetUserId, moderatorUser, durationMs = 3 * 60 * 1000) {
    const junction = this.junctions.get(districtId);
    if (!junction) return { success: false, error: 'Junction not found.' };

    const targetIndex = junction.participants.findIndex(p => p.userId === targetUserId);
    if (targetIndex === -1) return { success: false, error: 'Target user not in this junction.' };

    const targetParticipant = junction.participants[targetIndex];
    const targetUser = this.users.get(targetUserId);

    // CRITICAL: Owner is IMMUNE to any moderator action!
    if (targetUser?.role === ROLES.OWNER || targetParticipant.role === ROLES.OWNER) {
      return { success: false, error: 'Access Denied: The Original Website Owner cannot be kicked, muted, or banned!' };
    }

    // Managers cannot be kicked by moderators
    if (moderatorUser.role === ROLES.MODERATOR && targetUser?.role === ROLES.MANAGER) {
      return { success: false, error: 'Moderators cannot kick Managers.' };
    }

    // Remove from junction and add temporary rejoin ban
    const [removed] = junction.participants.splice(targetIndex, 1);
    junction.temporaryBans.set(targetUserId, Date.now() + durationMs);

    if (junction.activeModeratorId === targetUserId) {
      junction.activeModeratorId = null;
    }

    this.logAudit(moderatorUser, 'KICK_USER_FROM_JUNCTION', `Kicked ${targetParticipant.username} from ${junction.name} (Cooldown ${Math.round(durationMs / 1000)}s)`, targetUserId);

    return { success: true, removedSocketId: removed.socketId, junction, participant: removed };
  }

  toggleParticipantMute(districtId, targetUserId, moderatorUser, isMuted) {
    const junction = this.junctions.get(districtId);
    if (!junction) return { success: false, error: 'Junction not found.' };

    const target = junction.participants.find(p => p.userId === targetUserId);
    if (!target) return { success: false, error: 'User not found in junction.' };

    const targetUser = this.users.get(targetUserId);

    // CRITICAL: Owner is IMMUNE!
    if (targetUser?.role === ROLES.OWNER || target.role === ROLES.OWNER) {
      return { success: false, error: 'Access Denied: The Original Website Owner cannot be muted!' };
    }

    target.isMutedByMod = isMuted;
    if (isMuted) {
      target.isMicOn = false;
    }

    this.logAudit(moderatorUser, isMuted ? 'MUTE_USER_IN_JUNCTION' : 'UNMUTE_USER_IN_JUNCTION', `Moderator muted/unmuted ${target.username} in ${junction.name}`, targetUserId);

    return { success: true, target, junction };
  }
}

export const store = new CentralStore();
