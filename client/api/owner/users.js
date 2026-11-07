export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-requester-email');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const users = [
    {
      id: 'owner_preethive',
      email: 'preethivejr@gmail.com',
      displayName: 'Preethive (Super Manager)',
      photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=preethivejr%40gmail.com',
      role: 'OWNER',
      status: 'online',
      registeredAt: Date.now() - 86400000,
      lastActive: Date.now()
    },
    {
      id: 'user_karthik',
      email: 'chennai_stranger@gmail.com',
      displayName: 'Karthik (Chennai)',
      photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=chennai_stranger%40gmail.com',
      role: 'NORMAL_USER',
      status: 'online',
      registeredAt: Date.now() - 43200000,
      lastActive: Date.now()
    },
    {
      id: 'user_ananya',
      email: 'madurai_gamer@gmail.com',
      displayName: 'Ananya (Madurai)',
      photoURL: 'https://api.dicebear.com/7.x/bottts/svg?seed=madurai_gamer%40gmail.com',
      role: 'NORMAL_USER',
      status: 'online',
      registeredAt: Date.now() - 36000000,
      lastActive: Date.now()
    }
  ];

  return res.status(200).json(users);
}
