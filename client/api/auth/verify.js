const OWNER_EMAIL = 'preethivejr@gmail.com';

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-requester-email');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { token, user: clientUser } = req.body || {};
    const email = (clientUser?.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: 'Valid email is required for authentication.' });
    }

    const isOwner = email === OWNER_EMAIL;
    const displayName = clientUser.displayName || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const photoURL = clientUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;
    const userId = clientUser.uid || `user_${Math.abs(hashCode(email))}`;

    const verifiedUser = {
      id: userId,
      email,
      displayName,
      photoURL,
      role: isOwner ? 'OWNER' : 'NORMAL_USER',
      status: 'online',
      isMuted: false,
      isBanned: false,
      isSuspended: false,
      registeredAt: Date.now(),
      lastActive: Date.now()
    };

    return res.status(200).json({
      success: true,
      user: verifiedUser
    });
  } catch (error) {
    console.error('API /api/auth/verify error:', error);
    return res.status(500).json({ error: 'Authentication processing error' });
  }
}
