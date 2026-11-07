const COLORS = ['red', 'blue', 'green', 'yellow'];
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];

export class UnoGame {
  constructor(junctionId, players) {
    this.junctionId = junctionId;
    this.players = players.map(p => ({
      userId: p.userId,
      username: p.username,
      isBot: Boolean(p.isBot),
      cards: [],
      hasCalledUno: false
    }));
    this.deck = [];
    this.discardPile = [];
    this.currentTurnIndex = 0;
    this.direction = 1; // 1 for clockwise, -1 for counter-clockwise
    this.activeColor = null;
    this.activeValue = null;
    this.winner = null;
    this.status = 'IN_PROGRESS';
    this.lastAction = 'Game started! Match color, number, or play Wild.';

    this.initGame();
  }

  generateDeck() {
    const deck = [];
    let idCounter = 1;

    for (const color of COLORS) {
      // One '0' card per color
      deck.push({ id: `c_${idCounter++}`, color, value: '0' });

      // Two of each 1-9, skip, reverse, draw2
      for (const val of VALUES.slice(1)) {
        deck.push({ id: `c_${idCounter++}`, color, value: val });
        deck.push({ id: `c_${idCounter++}`, color, value: val });
      }
    }

    // 4 Wild and 4 Wild Draw Four
    for (let i = 0; i < 4; i++) {
      deck.push({ id: `c_${idCounter++}`, color: 'wild', value: 'wild' });
      deck.push({ id: `c_${idCounter++}`, color: 'wild', value: 'draw4' });
    }

    // Shuffle deck (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
  }

  initGame() {
    this.deck = this.generateDeck();

    // Deal 7 cards to each player
    for (let i = 0; i < 7; i++) {
      for (const player of this.players) {
        player.cards.push(this.drawFromDeck());
      }
    }

    // Start discard pile with a non-wild4 card
    let initialCard = this.drawFromDeck();
    while (initialCard.value === 'draw4') {
      this.deck.unshift(initialCard);
      initialCard = this.drawFromDeck();
    }

    this.discardPile.push(initialCard);
    this.activeColor = initialCard.color === 'wild' ? 'red' : initialCard.color;
    this.activeValue = initialCard.value;
  }

  drawFromDeck() {
    if (this.deck.length === 0) {
      if (this.discardPile.length <= 1) {
        // Regenerate deck if completely exhausted
        this.deck = this.generateDeck();
      } else {
        const top = this.discardPile.pop();
        this.deck = this.discardPile;
        this.discardPile = [top];
        // Reshuffle
        for (let i = this.deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
      }
    }
    return this.deck.pop();
  }

  getCurrentPlayer() {
    return this.players[this.currentTurnIndex];
  }

  advanceTurn(skipCount = 1) {
    const total = this.players.length;
    this.currentTurnIndex = (this.currentTurnIndex + (this.direction * skipCount) % total + total) % total;
  }

  canPlayCard(card) {
    if (card.color === 'wild') return true;
    if (card.color === this.activeColor) return true;
    if (card.value === this.activeValue) return true;
    return false;
  }

  playCard(userId, cardId, chosenWildColor) {
    if (this.status !== 'IN_PROGRESS') return { error: 'Game has already ended.' };
    const player = this.getCurrentPlayer();
    if (player.userId !== userId) return { error: 'Not your turn.' };

    const cardIndex = player.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return { error: 'You do not own this card.' };

    const card = player.cards[cardIndex];
    if (!this.canPlayCard(card)) {
      return { error: `Invalid card! Must match active color (${this.activeColor}) or value (${this.activeValue}).` };
    }

    // Remove card from hand
    player.cards.splice(cardIndex, 1);
    this.discardPile.push(card);

    let nextTurnSkip = 1;
    let actionDescription = `${player.username} played ${card.color} ${card.value}`;

    // Handle special actions
    if (card.color === 'wild') {
      const selectedColor = chosenWildColor && COLORS.includes(chosenWildColor) ? chosenWildColor : 'red';
      this.activeColor = selectedColor;
      this.activeValue = card.value;

      if (card.value === 'draw4') {
        const nextIdx = (this.currentTurnIndex + this.direction + this.players.length) % this.players.length;
        const target = this.players[nextIdx];
        for (let k = 0; k < 4; k++) target.cards.push(this.drawFromDeck());
        nextTurnSkip = 2; // target skips turn
        actionDescription = `${player.username} played Wild Draw 4! ${target.username} drew 4 cards and lost turn. Color set to ${selectedColor.toUpperCase()}`;
      } else {
        actionDescription = `${player.username} played Wild! New color is ${selectedColor.toUpperCase()}`;
      }
    } else {
      this.activeColor = card.color;
      this.activeValue = card.value;

      if (card.value === 'skip') {
        nextTurnSkip = 2;
        actionDescription = `${player.username} played Skip!`;
      } else if (card.value === 'reverse') {
        if (this.players.length === 2) {
          nextTurnSkip = 2;
          actionDescription = `${player.username} played Reverse (act as Skip in 2-player)!`;
        } else {
          this.direction *= -1;
          actionDescription = `${player.username} reversed play direction!`;
        }
      } else if (card.value === 'draw2') {
        const nextIdx = (this.currentTurnIndex + this.direction + this.players.length) % this.players.length;
        const target = this.players[nextIdx];
        for (let k = 0; k < 2; k++) target.cards.push(this.drawFromDeck());
        nextTurnSkip = 2;
        actionDescription = `${player.username} played Draw 2! ${target.username} drew 2 cards and lost turn.`;
      }
    }

    // Check UNO call warning: If 1 card left and didn't call UNO, can be penalized
    if (player.cards.length === 1 && !player.hasCalledUno) {
      actionDescription += ` (UNO alert: ${player.username} has only 1 card left!)`;
    }

    // Check Win Condition
    if (player.cards.length === 0) {
      this.winner = player;
      this.status = 'FINISHED';
      this.lastAction = `🏆 ${player.username} played their last card and WON the UNO match!`;
      return { success: true, game: this.getState() };
    }

    this.lastAction = actionDescription;
    this.advanceTurn(nextTurnSkip);

    return { success: true, game: this.getState() };
  }

  drawCard(userId) {
    if (this.status !== 'IN_PROGRESS') return { error: 'Game has already ended.' };
    const player = this.getCurrentPlayer();
    if (player.userId !== userId) return { error: 'Not your turn.' };

    const drawn = this.drawFromDeck();
    player.cards.push(drawn);
    player.hasCalledUno = false;

    this.lastAction = `${player.username} drew a card.`;
    this.advanceTurn(1);

    return { success: true, drawnCard: drawn, game: this.getState() };
  }

  callUno(userId) {
    const player = this.players.find(p => p.userId === userId);
    if (!player) return { error: 'Player not in game.' };

    if (player.cards.length <= 2) {
      player.hasCalledUno = true;
      this.lastAction = `⚡ ${player.username} loudly shouted "UNO!"`;
      return { success: true, game: this.getState() };
    } else {
      return { error: 'You can only call UNO when you have 1 or 2 cards!' };
    }
  }

  playBotTurn() {
    if (this.status !== 'IN_PROGRESS') return null;
    const player = this.getCurrentPlayer();
    if (!player || !player.isBot) return null;

    const playable = player.cards.find(c => this.canPlayCard(c));
    if (playable) {
      if (player.cards.length === 2) {
        player.hasCalledUno = true;
      }
      const chosenColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      return this.playCard(player.userId, playable.id, chosenColor);
    } else {
      return this.drawCard(player.userId);
    }
  }

  getState(forUserId = null) {
    return {
      type: 'uno',
      junctionId: this.junctionId,
      status: this.status,
      winner: this.winner ? { userId: this.winner.userId, username: this.winner.username } : null,
      currentTurnIndex: this.currentTurnIndex,
      currentTurnUser: this.getCurrentPlayer() ? { userId: this.getCurrentPlayer().userId, username: this.getCurrentPlayer().username } : null,
      direction: this.direction,
      activeColor: this.activeColor,
      activeValue: this.activeValue,
      topDiscard: this.discardPile[this.discardPile.length - 1],
      deckRemaining: this.deck.length,
      lastAction: this.lastAction,
      players: this.players.map(p => ({
        userId: p.userId,
        username: p.username,
        cardCount: p.cards.length,
        hasCalledUno: p.hasCalledUno,
        // Only disclose own cards to player (or all in spectator mode)
        cards: (!forUserId || p.userId === forUserId) ? p.cards : p.cards.map(c => ({ id: c.id, hidden: true }))
      }))
    };
  }
}
