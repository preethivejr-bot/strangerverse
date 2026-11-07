const LUDO_COLORS = ['red', 'green', 'yellow', 'blue'];

const START_OFFSETS = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39
};

const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

export class LudoGame {
  constructor(junctionId, players) {
    this.junctionId = junctionId;
    this.players = players.map((p, idx) => {
      const color = LUDO_COLORS[idx % LUDO_COLORS.length];
      return {
        userId: p.userId,
        username: p.username,
        color,
        tokens: [
          { id: 0, state: 'YARD', stepCount: -1, trackPos: -1 },
          { id: 1, state: 'YARD', stepCount: -1, trackPos: -1 },
          { id: 2, state: 'YARD', stepCount: -1, trackPos: -1 },
          { id: 3, state: 'YARD', stepCount: -1, trackPos: -1 },
        ],
        finishedCount: 0
      };
    });

    this.currentTurnIndex = 0;
    this.currentDice = null;
    this.hasRolled = false;
    this.winner = null;
    this.status = 'IN_PROGRESS';
    this.lastAction = 'Ludo game started! Roll the dice to begin.';
    this.consecutiveSixes = 0;
  }

  getCurrentPlayer() {
    return this.players[this.currentTurnIndex];
  }

  advanceTurn() {
    this.hasRolled = false;
    this.currentDice = null;
    this.consecutiveSixes = 0;
    this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
  }

  rollDice(userId) {
    if (this.status !== 'IN_PROGRESS') return { error: 'Game finished.' };
    const player = this.getCurrentPlayer();
    if (player.userId !== userId) return { error: 'Not your turn.' };
    if (this.hasRolled) return { error: 'You have already rolled the dice! Select a token to move.' };

    const dice = Math.floor(Math.random() * 6) + 1;
    this.currentDice = dice;
    this.hasRolled = true;

    if (dice === 6) {
      this.consecutiveSixes++;
      if (this.consecutiveSixes === 3) {
        // Penalty for 3 consecutive sixes: lose turn
        this.lastAction = `⚠️ ${player.username} rolled three 6s in a row! Turn forfeited.`;
        this.advanceTurn();
        return { success: true, dice, game: this.getState() };
      }
    } else {
      this.consecutiveSixes = 0;
    }

    // Check if player has any valid moves
    const validMoves = this.getValidTokensForPlayer(player, dice);

    if (validMoves.length === 0) {
      this.lastAction = `${player.username} rolled a ${dice}. No valid moves available.`;
      // Auto-advance turn if no moves possible
      this.advanceTurn();
    } else if (validMoves.length === 1 && validMoves[0].state === 'YARD' && dice === 6) {
      // Auto move out of yard if only 1 valid move and it's spawning
      return this.moveToken(userId, validMoves[0].id);
    } else {
      this.lastAction = `${player.username} rolled a ${dice}! Choose a token to move.`;
    }

    return { success: true, dice, validTokenIds: validMoves.map(t => t.id), game: this.getState() };
  }

  getValidTokensForPlayer(player, dice) {
    return player.tokens.filter(token => {
      if (token.state === 'FINISHED') return false;
      if (token.state === 'YARD') return dice === 6;
      if (token.state === 'TRACK' || token.state === 'HOME_COLUMN') {
        return (token.stepCount + dice) <= 57; // 0..50 track, 51..56 home col, 57 is finished
      }
      return false;
    });
  }

  moveToken(userId, tokenId) {
    if (this.status !== 'IN_PROGRESS') return { error: 'Game finished.' };
    const player = this.getCurrentPlayer();
    if (player.userId !== userId) return { error: 'Not your turn.' };
    if (!this.hasRolled || !this.currentDice) return { error: 'Roll dice first.' };

    const token = player.tokens.find(t => t.id === tokenId);
    if (!token) return { error: 'Invalid token.' };

    const dice = this.currentDice;
    const startTrack = START_OFFSETS[player.color];

    let bonusRoll = (dice === 6);
    let capturedOpponent = false;

    if (token.state === 'YARD') {
      if (dice !== 6) return { error: 'Need a 6 to release token from yard!' };
      token.state = 'TRACK';
      token.stepCount = 0;
      token.trackPos = startTrack;
      this.lastAction = `🚀 ${player.username} brought token #${tokenId + 1} onto the track!`;
    } else {
      const newStep = token.stepCount + dice;
      if (newStep > 57) {
        return { error: 'Cannot overshoot Home!' };
      }

      token.stepCount = newStep;

      if (newStep === 57) {
        token.state = 'FINISHED';
        token.trackPos = -1;
        player.finishedCount++;
        bonusRoll = true;
        this.lastAction = `🌟 ${player.username}'s token #${tokenId + 1} entered HOME! (Bonus roll granted)`;

        // Check if player won
        if (player.finishedCount === 4) {
          this.winner = player;
          this.status = 'FINISHED';
          this.lastAction = `👑 ${player.username} has gotten all 4 tokens home and WON the Ludo championship!`;
          return { success: true, game: this.getState() };
        }
      } else if (newStep >= 51) {
        token.state = 'HOME_COLUMN';
        token.trackPos = -1;
        this.lastAction = `${player.username} moved token #${tokenId + 1} into Home Column (${newStep - 50}/6).`;
      } else {
        token.state = 'TRACK';
        token.trackPos = (startTrack + newStep) % 52;

        // Check for token capture on non-safe square
        if (!SAFE_SQUARES.includes(token.trackPos)) {
          for (const otherPlayer of this.players) {
            if (otherPlayer.userId === player.userId) continue;
            for (const otherToken of otherPlayer.tokens) {
              if (otherToken.state === 'TRACK' && otherToken.trackPos === token.trackPos) {
                // CAPTURE!
                otherToken.state = 'YARD';
                otherToken.stepCount = -1;
                otherToken.trackPos = -1;
                capturedOpponent = true;
                bonusRoll = true;
                this.lastAction = `💥 CAPTURE! ${player.username} knocked out ${otherPlayer.username}'s token back to yard! Extra turn granted!`;
              }
            }
          }
        }

        if (!capturedOpponent) {
          this.lastAction = `${player.username} moved token #${tokenId + 1} ${dice} spaces forward.`;
        }
      }
    }

    if (bonusRoll && this.status === 'IN_PROGRESS') {
      this.hasRolled = false;
      this.currentDice = null;
      this.lastAction += ' (Roll again!)';
    } else {
      this.advanceTurn();
    }

    return { success: true, game: this.getState() };
  }

  getState() {
    return {
      type: 'ludo',
      junctionId: this.junctionId,
      status: this.status,
      winner: this.winner ? { userId: this.winner.userId, username: this.winner.username, color: this.winner.color } : null,
      currentTurnIndex: this.currentTurnIndex,
      currentTurnUser: this.getCurrentPlayer() ? { userId: this.getCurrentPlayer().userId, username: this.getCurrentPlayer().username, color: this.getCurrentPlayer().color } : null,
      currentDice: this.currentDice,
      hasRolled: this.hasRolled,
      lastAction: this.lastAction,
      safeSquares: SAFE_SQUARES,
      players: this.players.map(p => ({
        userId: p.userId,
        username: p.username,
        color: p.color,
        finishedCount: p.finishedCount,
        tokens: p.tokens
      }))
    };
  }
}
