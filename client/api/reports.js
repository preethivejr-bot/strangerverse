export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-requester-email');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const report = {
      id: `rep_${Date.now()}`,
      ...req.body,
      status: 'PENDING',
      timestamp: Date.now()
    };
    return res.status(200).json({ success: true, report });
  }

  return res.status(200).json([]);
}
