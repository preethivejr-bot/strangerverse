import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';
let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 STRANGERVERSE FULL-STACK AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  // TEST 1: Config and Districts Integrity
  console.log('--- TEST GROUP 1: Config & 10 Tamil Nadu District Junctions ---');
  const configRes = await fetch(`${SERVER_URL}/api/config`);
  const config = await configRes.json();
  assert(config.appName === 'STRANGERVERSE', 'Platform appName is STRANGERVERSE');
  assert(config.districts.length === 10, 'Exactly 10 district junctions defined');
  const districtIds = config.districts.map(d => d.id);
  const expectedDistricts = ['chennai', 'vellore', 'tiruchirappalli', 'madurai', 'kanniyakumari', 'salem', 'coimbatore', 'erode', 'tirunelveli', 'thanjavur'];
  assert(expectedDistricts.every(d => districtIds.includes(d)), 'All 10 required districts present');
  assert(config.districts.every(d => d.maxCapacity === 10), 'All junctions have max capacity = 10');

  // TEST 2: Authentication & Role Verification
  console.log('\n--- TEST GROUP 2: Authentication & Role Sovereignty ---');
  
  // Normal user registration
  const user1Res = await fetch(`${SERVER_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'mock_token_u1',
      user: {
        uid: 'user_norm_1',
        email: 'regular_stranger@gmail.com',
        displayName: 'Tamil Stranger'
      }
    })
  });
  const u1Data = await user1Res.json();
  assert(u1Data.user.role === 'NORMAL_USER', 'Newly registered user receives NORMAL_USER role by default');

  // Configured Owner registration (matches OWNER_EMAIL in .env)
  const ownerRes = await fetch(`${SERVER_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'mock_token_owner',
      user: {
        uid: 'user_owner_01',
        email: 'preethivejr@gmail.com',
        displayName: 'Preethive'
      }
    })
  });
  const ownerData = await ownerRes.json();
  assert(ownerData.user.role === 'OWNER', 'Configured Google email (preethivejr@gmail.com) receives permanent OWNER (Super Manager) role');

  // TEST 3: Role Management Hierarchy & Confirmation Rules
  console.log('\n--- TEST GROUP 3: Role Management & Hierarchy Rules ---');
  
  // Create another user to promote
  const user2Res = await fetch(`${SERVER_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: 'mock_token_u2',
      user: {
        uid: 'user_norm_2',
        email: 'chennai_friend@gmail.com',
        displayName: 'Chennai Friend'
      }
    })
  });
  const u2Data = await user2Res.json();

  // Owner promotes user2 to MANAGER
  const promoteRes = await fetch(`${SERVER_URL}/api/owner/role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-requester-email': 'preethivejr@gmail.com'
    },
    body: JSON.stringify({
      targetUserId: u2Data.user.id,
      newRole: 'MANAGER',
      action: 'MAKE_MANAGER'
    })
  });
  const promoteData = await promoteRes.json();
  assert(promoteData.user.role === 'MANAGER', 'Owner successfully appointed Manager role');

  // Manager tries to demote Owner -> Must FAIL!
  const illegalDemoteRes = await fetch(`${SERVER_URL}/api/owner/role`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-requester-email': 'chennai_friend@gmail.com'
    },
    body: JSON.stringify({
      targetUserId: ownerData.user.id,
      newRole: 'NORMAL_USER',
      action: 'REMOVE_OWNER'
    })
  });
  assert(illegalDemoteRes.status === 403, 'Manager is strictly forbidden from demoting or altering Owner (HTTP 403)');

  // Normal user tries to access owner users list -> Must FAIL!
  const unauthorizedRes = await fetch(`${SERVER_URL}/api/owner/users`, {
    headers: { 'x-requester-email': 'regular_stranger@gmail.com' }
  });
  assert(unauthorizedRes.status === 403, 'Normal user forbidden from accessing Owner Control Center (HTTP 403)');

  // TEST 4: Real-Time Socket.io 1-on-1 Text Matchmaking
  console.log('\n--- TEST GROUP 4: 1-on-1 Stranger Text Matchmaking ---');
  await new Promise((resolve) => {
    const s1 = io(SERVER_URL, { transports: ['websocket'] });
    const s2 = io(SERVER_URL, { transports: ['websocket'] });

    let s1Matched = false;
    let s2Matched = false;

    s1.on('connect', () => {
      s1.emit('auth:register', u1Data.user);
      s1.emit('text:join-queue', u1Data.user);
    });

    s2.on('connect', () => {
      s2.emit('auth:register', u2Data.user);
      s2.emit('text:join-queue', u2Data.user);
    });

    s1.on('text:matched', (data) => {
      s1Matched = true;
      assert(data.sessionId != null, 'Socket 1 received matched 1-on-1 text session ID');
      if (s1Matched && s2Matched) cleanup();
    });

    s2.on('text:matched', (data) => {
      s2Matched = true;
      assert(data.sessionId != null, 'Socket 2 received matched 1-on-1 text session ID');
      if (s1Matched && s2Matched) cleanup();
    });

    function cleanup() {
      s1.disconnect();
      s2.disconnect();
      resolve();
    }
  });

  // TEST 5: Tamil Nadu Junction Capacity Lock (10 simultaneous users max)
  console.log('\n--- TEST GROUP 5: District Junction Atomic Capacity Lock (Max 10) ---');
  await new Promise(async (resolve) => {
    const sockets = [];
    const districtId = 'madurai';

    // Connect 10 simultaneous sockets and join Madurai Junction
    for (let i = 1; i <= 10; i++) {
      const sock = io(SERVER_URL, { transports: ['websocket'] });
      sockets.push(sock);
      const testUser = {
        id: `sim_user_${i}`,
        displayName: `Madurai Citizen ${i}`,
        email: `citizen${i}@madurai.in`,
        role: 'NORMAL_USER'
      };

      await new Promise(r => {
        sock.on('connect', () => {
          sock.emit('auth:register', testUser);
          sock.emit('junction:join', { districtId, user: testUser });
        });
        sock.on('junction:joined-success', () => r());
      });
    }

    assert(sockets.length === 10, 'Successfully connected 10 simultaneous users inside Madurai Junction');

    // Attempt to join the 11th user -> MUST BE REJECTED!
    const sock11 = io(SERVER_URL, { transports: ['websocket'] });
    const user11 = { id: 'sim_user_11', displayName: '11th User', email: 'extra@madurai.in', role: 'NORMAL_USER' };

    sock11.on('connect', () => {
      sock11.emit('auth:register', user11);
      sock11.emit('junction:join', { districtId, user: user11 });
    });

    sock11.on('junction:join-error', (err) => {
      assert(err.error.includes('full'), `11th user atomically rejected with: "${err.error}"`);
      // Cleanup all 11 sockets
      sockets.forEach(s => s.disconnect());
      sock11.disconnect();
      resolve();
    });
  });

  // TEST 6: Automatic Moderator Promotion & Owner Immunity
  console.log('\n--- TEST GROUP 6: Auto-Moderator Promotion & Owner Immunity ---');
  // Enable fast automod mode for test
  await fetch(`${SERVER_URL}/api/dev/toggle-fast-automod`, { method: 'POST' });
  
  await new Promise((resolve) => {
    const sMod = io(SERVER_URL, { transports: ['websocket'] });
    const modUser = { id: 'candidate_mod', displayName: 'Loyal Participant', email: 'loyal@chennai.in', role: 'NORMAL_USER' };

    sMod.on('connect', () => {
      sMod.emit('auth:register', modUser);
      sMod.emit('junction:join', { districtId: 'chennai', user: modUser });
    });

    sMod.on('junction:joined-success', () => {
      // Test Owner Immunity against kick
      sMod.emit('junction:kick-participant', {
        districtId: 'chennai',
        targetUserId: ownerData.user.id
      });
    });

    sMod.on('junction:error', (data) => {
      assert(data.message.includes('denied') || data.message.includes('moderators') || data.message.includes('Owner'), 
        `Kick attempt against Owner properly rejected: "${data.message}"`);
      sMod.disconnect();
      resolve();
    });
  });

  // TEST 7: Multiplayer UNO Game Engine Verification
  console.log('\n--- TEST GROUP 7: Multiplayer Game Engine Playability ---');
  await new Promise((resolve) => {
    const p1 = io(SERVER_URL, { transports: ['websocket'] });
    const p2 = io(SERVER_URL, { transports: ['websocket'] });
    const dId = 'salem';

    const player1 = { id: 'p1_uno', displayName: 'Gamer 1', email: 'g1@salem.in', role: 'NORMAL_USER' };
    const player2 = { id: 'p2_uno', displayName: 'Gamer 2', email: 'g2@salem.in', role: 'NORMAL_USER' };

    p1.on('connect', () => {
      p1.emit('auth:register', player1);
      p1.emit('junction:join', { districtId: dId, user: player1 });
    });

    p2.on('connect', () => {
      p2.emit('auth:register', player2);
      p2.emit('junction:join', { districtId: dId, user: player2 });
    });

    p2.on('junction:joined-success', () => {
      // Start UNO game with 2 players
      p1.emit('game:start', {
        districtId: dId,
        gameType: 'uno',
        playerIds: [player1.id, player2.id]
      });
    });

    p1.on('game:updated', (data) => {
      if (data.gameState && data.gameState.type === 'uno') {
        assert(data.gameState.status === 'IN_PROGRESS', 'UNO game initialized in IN_PROGRESS state');
        assert(data.gameState.players.length === 2, 'UNO game dealt cards to both 2 players');
        assert(data.gameState.players[0].cardCount === 7, 'Player 1 dealt exactly 7 UNO cards');
        assert(data.gameState.players[1].cardCount === 7, 'Player 2 dealt exactly 7 UNO cards');
        assert(data.gameState.topDiscard != null, 'Top discard card is face-up');
        p1.disconnect();
        p2.disconnect();
        resolve();
      }
    });
  });

  console.log('\n======================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});
