const TRUTHS = [
  "What is the most spontaneous thing you've ever done while traveling in Tamil Nadu?",
  "If you had to live in one Tamil Nadu district for the rest of your life, which one and why?",
  "What is your guilty pleasure snack that nobody else seems to like?",
  "Have you ever sent a text message to the completely wrong person and regretted it instantly?",
  "What is an embarrassing childhood nickname your parents or schoolmates gave you?",
  "If you could trade lives with any celebrity or public figure for 24 hours, who would it be?",
  "What is the strangest food combination you secretly enjoy?",
  "What was the biggest lie you ever told your teachers or parents to skip something?",
  "What is one skill or hobby you always brag about but are secretly mediocre at?",
  "If you found a bag with ₹10,00,000 cash on the street with no identification, what would you do?",
  "What is your biggest irrational fear?",
  "What is the funniest rumor you ever heard about yourself?",
  "If your phone’s browser history from the last 7 days was displayed on a billboard, how embarrassed would you be?",
  "What is one movie everyone loves that you secretly think is terrible?",
  "What is the most ridiculous excuse you used to get out of a date or meeting?"
];

const DARES = [
  "Speak with an exaggerated radio DJ voice for the next 2 minutes in the voice chat!",
  "Sing the chorus of your favorite Tamil or English song right now in the junction mic!",
  "Do 10 jumping jacks or pushups and let everyone in the junction count along!",
  "Make your best impression of a crying baby or a roaring tiger on the microphone!",
  "Tell a hilariously bad dad joke in the chat and wait for reactions!",
  "Recite the alphabet backwards starting from Z to P without stopping!",
  "Type a tongue twister in the text chat 3 times in 10 seconds without making a single typo!",
  "Talk without using the letter 'E' in your spoken sentences for the next 45 seconds!",
  "Pretend you are an alien exploring planet Earth for the first time describing humans!",
  "Show everyone an item within arm's reach and pitch it like an infomercial salesman for 30 seconds!",
  "Do your best mimicry of a famous movie character or politician!",
  "Give a 30-second motivational speech to the strangerverse room about drinking water!",
  "Speak in rhymes for the next 3 sentences you say or type!",
  "Make the funniest sound effect you can produce into your microphone!"
];

export class TruthDareGame {
  constructor(junctionId, players) {
    this.type = 'truth_dare';
    this.junctionId = junctionId;
    this.players = players.map(p => ({
      userId: p.userId,
      username: p.username,
      score: 0
    }));
    this.selectedPlayerId = null;
    this.currentMode = null; // 'TRUTH' or 'DARE'
    this.currentPrompt = null;
    this.status = 'WAITING_SPIN'; // 'WAITING_SPIN', 'CHOOSING', 'IN_ACTION', 'COMPLETED'
    this.turnHistory = [];
    this.lastAction = 'Truth or Dare started! Spin the bottle to choose the first player.';
  }

  spinBottle() {
    if (this.players.length === 0) return { error: 'No players in game.' };

    const randomIdx = Math.floor(Math.random() * this.players.length);
    const chosen = this.players[randomIdx];
    this.selectedPlayerId = chosen.userId;
    this.status = 'CHOOSING';
    this.currentMode = null;
    this.currentPrompt = null;
    this.lastAction = `🍾 The bottle spun and pointed to ${chosen.username}! Choose TRUTH or DARE!`;

    return { success: true, game: this.getState() };
  }

  chooseMode(userId, mode) {
    if (this.selectedPlayerId !== userId) return { error: 'It is not your turn to choose!' };
    if (this.status !== 'CHOOSING') return { error: 'Not in choosing state.' };
    if (mode !== 'TRUTH' && mode !== 'DARE') return { error: 'Invalid mode.' };

    this.currentMode = mode;
    this.status = 'IN_ACTION';

    const pool = mode === 'TRUTH' ? TRUTHS : DARES;
    const prompt = pool[Math.floor(Math.random() * pool.length)];
    this.currentPrompt = prompt;

    const player = this.players.find(p => p.userId === userId);
    this.lastAction = `🔥 ${player.username} chose ${mode}: "${prompt}"`;

    return { success: true, prompt, game: this.getState() };
  }

  completeTurn(userId) {
    const player = this.players.find(p => p.userId === this.selectedPlayerId);
    if (!player) return { error: 'Selected player missing.' };

    player.score += 10;
    this.status = 'WAITING_SPIN';
    this.lastAction = `✅ ${player.username} completed their challenge! (+10 pts). Spin the bottle for the next round!`;

    return { success: true, game: this.getState() };
  }

  skipTurn(userId) {
    const player = this.players.find(p => p.userId === this.selectedPlayerId);
    if (!player) return { error: 'Selected player missing.' };

    this.status = 'WAITING_SPIN';
    this.lastAction = `⏭️ ${player.username} skipped the challenge. Spin the bottle for the next player!`;

    return { success: true, game: this.getState() };
  }

  getState() {
    const selected = this.players.find(p => p.userId === this.selectedPlayerId);
    return {
      type: 'truth_dare',
      junctionId: this.junctionId,
      status: this.status,
      selectedPlayer: selected ? { userId: selected.userId, username: selected.username } : null,
      currentMode: this.currentMode,
      currentPrompt: this.currentPrompt,
      lastAction: this.lastAction,
      players: this.players
    };
  }
}
