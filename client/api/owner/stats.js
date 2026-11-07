export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-requester-email');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    totalUsers: 12,
    onlineUsers: 4,
    totalManagers: 1,
    totalModerators: 2,
    activeJunctions: 10,
    active1on1Sessions: 1,
    pendingReports: 0,
    fastModeratorMode: false
  });
}
