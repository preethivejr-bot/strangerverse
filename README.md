# STRANGERVERSE

> **Tagline:** *"Meet Strangers. Connect Locally. Play Together."*

STRANGERVERSE is a complete, real-time stranger communication, local community, and multiplayer gaming platform. It features 1-on-1 WebRTC voice and text matchmaking, 10 dedicated Tamil Nadu District Junctions with atomic capacity limits (10/10), an automatic continuous stay moderator promotion engine (10-minute rule), cryptographic 4-tier role management, and server-authoritative multiplayer games (UNO, Ludo, and Truth or Dare).

---

## 🌌 Platform Overview & Architecture

### 1. Futuristic Dark Neon Aesthetics & Branding
- **Color Palette:** Dark Navy (`#070B19`, `#050711`), Purple gradients (`#8B5CF6`, `#A855F7`), Electric Blue (`#3B82F6`), Neon Cyan (`#00F5FF`), and Vibrant Accents.
- **Glassmorphism:** High-performance backdrop blur (`backdrop-blur-xl`), animated micro-interactions, responsive mobile drawers, and glowing indicators.
- **Typography:** Orbitron for sci-fi titles and Inter for high-legibility messaging.

### 2. Google Authentication & 4-Tier Sovereign Role Hierarchy
- **Level 1: ORIGINAL OWNER / SUPER MANAGER**
  - Controlled by the `OWNER_EMAIL` environment variable.
  - Receives the permanent `OWNER` role upon Google login.
  - Immune to muting, kicking, demotion, or bans by any manager or moderator.
- **Level 2: MANAGER**
  - Appointed strictly by the Original Owner.
  - Can manage rooms and appoint Moderators. Cannot appoint Managers or modify the Owner.
- **Level 3: MODERATOR**
  - Appointed by Owner/Manager or **automatically promoted** after 10 continuous minutes inside a district junction.
  - Can mute or remove disruptive members from their junction.
- **Level 4: NORMAL USER**
  - Default role assigned to every newly registered user.
  - No user can choose or escalate their own role.

### 3. Random Stranger Voice & Text Matching
- **Random Voice Chat:** Real-time WebRTC audio connection, animated voice activity visualizer, mic mute/unmute, "Next Stranger", "Disconnect", and reporting controls.
- **Random Text Chat:** Independent matchmaking queue, instant WebSocket message delivery, typing indicators ("Stranger is typing..."), and timestamps.

### 4. 10 Tamil Nadu District Junctions (Max Capacity: 10/10)
1. **Chennai** — *Gateway of South India • Marina & Tech Hub*
2. **Vellore** — *Fort City & Medical Capital*
3. **Tiruchirappalli** — *Rockfort & Cauvery Heartland*
4. **Madurai** — *Thoonga Nagaram • City that Never Sleeps*
5. **Kanniyakumari** — *Cape Comorin • Confluence of Three Oceans*
6. **Salem** — *Steel City & Mango Capital*
7. **Coimbatore** — *Manchester of South India • Kovai Breeze*
8. **Erode** — *Turmeric City & Textile Loom Haven*
9. **Tirunelveli** — *Halwa City & Nellaiappar Pride*
10. **Thanjavur** — *Rice Bowl of Tamil Nadu & Chola Splendor*

- **Atomic Capacity Engine:** Strictly caps simultaneous users at 10. The 11th user is rejected with an atomic race-condition guard.
- **Comms Inside Junction:** Real-time WebRTC group voice, text messaging, and individual local user mute.

### 5. Automatic Moderator System
- Tracks continuous stay time inside each junction.
- After 10 continuous minutes, the earliest eligible user becomes the Room Moderator.
- If the moderator leaves, succession logic automatically promotes the next eligible member.
- Timer resets if a user leaves the junction.

### 6. Multiplayer Games Inside Junctions
- **UNO:** 2 to 4 players, 108 cards, Skip, Reverse, Draw Two, Wild, Wild Draw Four, "Call UNO!" button, and win detection with confetti.
- **Ludo:** 2 to 4 players, colored quadrants, animated 3D dice rolls (1-6), safe star squares, token capture, bonus rolls, and victory detection.
- **Truth or Dare:** Multi-participant session, interactive spinning bottle, curated questions and challenges, skip/complete options, and scoring.

---

## 🛠️ Quickstart & Running Locally

### Prerequisites
- Node.js v18+ (tested on Node v24.22)
- pnpm or npm

### 1. Configuration
Open `server/.env` and specify your Google email:
```env
OWNER_EMAIL=preethivejr@gmail.com
PORT=5000
NODE_ENV=development
```

### 2. Start the Fullstack Server
```powershell
cd server
npm start
# Server starts on http://localhost:5000 and serves both REST APIs, WebSockets, and built frontend
```

### 3. Client Development (Optional Hot-Reloading)
```powershell
cd client
pnpm dev
# Runs Vite dev server at http://localhost:5173
```

---

## 🧪 Running Automated Tests
```powershell
cd server
node test/test_suite.js
```
The test suite validates all 7 core subsystems:
1. District configuration (10 districts, 10-user capacity).
2. Google authentication & default `NORMAL_USER` assignment.
3. Owner role assignment & Level 1 hierarchy enforcement.
4. Real-time 1-on-1 stranger text matchmaking.
5. Atomic 10-user max capacity lock (preventing 11th user).
6. Auto-moderator promotion & Owner immunity against kicks.
7. Multiplayer UNO game dealing and state machine.

---

## 🔒 Production Security & Firebase Deployment
- `firestore.rules`: Contains cryptographic Firestore rules enforcing the 4-tier hierarchy.
- `firebase.json`: Configured for Firebase Hosting and Cloud Functions rewrites.
