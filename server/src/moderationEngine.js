import { store } from './store.js';
import { ROLES, AUTO_MODERATOR_THRESHOLD_MS, FAST_TEST_AUTO_MODERATOR_THRESHOLD_MS } from './constants.js';

class ModerationEngine {
  constructor() {
    this.timer = null;
    this.io = null;
  }

  start(io) {
    this.io = io;
    if (this.timer) clearInterval(this.timer);

    // Ticker runs every 3 seconds to monitor stay durations and promote eligible users
    this.timer = setInterval(() => {
      this.evaluateAllJunctions();
    }, 3000);

    console.log('[Moderation Engine] Started automatic continuous stay tracking ticker.');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  evaluateAllJunctions() {
    const now = Date.now();
    const threshold = store.fastModeratorMode 
      ? FAST_TEST_AUTO_MODERATOR_THRESHOLD_MS 
      : AUTO_MODERATOR_THRESHOLD_MS;

    for (const [districtId, junction] of store.junctions.entries()) {
      if (junction.participants.length === 0) {
        junction.activeModeratorId = null;
        continue;
      }

      // Check if current active moderator is still present inside junction
      const currentMod = junction.participants.find(p => p.userId === junction.activeModeratorId);
      if (!currentMod) {
        junction.activeModeratorId = null;
      }

      // If there is already an active moderator, nothing to do
      if (junction.activeModeratorId) {
        continue;
      }

      // Find candidates who have stayed continuously >= threshold
      // Sort by joinedAt ascending (earliest continuous stay first)
      const sortedCandidates = [...junction.participants]
        .filter(p => {
          // Do not overwrite Owner or Manager roles with room Moderator role
          if (p.role === ROLES.OWNER || p.role === ROLES.MANAGER) return false;
          const continuousDuration = now - p.joinedAt;
          return continuousDuration >= threshold;
        })
        .sort((a, b) => a.joinedAt - b.joinedAt);

      if (sortedCandidates.length > 0) {
        const promotedUser = sortedCandidates[0];
        junction.activeModeratorId = promotedUser.userId;
        promotedUser.role = ROLES.MODERATOR;

        // Also update the global user record if they are a normal user
        const user = store.getUser(promotedUser.userId);
        if (user && user.role === ROLES.NORMAL_USER) {
          user.role = ROLES.MODERATOR;
        }

        store.logAudit(
          { displayName: 'SYSTEM (AutoMod)', role: 'SYSTEM' },
          'AUTO_PROMOTE_MODERATOR',
          `${promotedUser.username} achieved 10 min continuous presence in ${junction.name} and was promoted to Room Moderator.`,
          promotedUser.userId
        );

        // Broadcast promotion to the junction
        if (this.io) {
          this.io.to(`junction_${districtId}`).emit('junction:moderator-promoted', {
            districtId,
            moderatorId: promotedUser.userId,
            moderatorName: promotedUser.username,
            timestamp: now,
            message: `🎉 ${promotedUser.username} has been promoted to Room Moderator for staying continuously!`
          });

          // Broadcast updated junctions list so cards show active moderator
          this.io.emit('junctions:updated', store.getAllJunctionsSummary());
        }
      }
    }
  }
}

export const moderationEngine = new ModerationEngine();
