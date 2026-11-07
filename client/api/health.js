export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.status(200).json({
    status: 'ONLINE',
    service: 'STRANGERVERSE Production Edge API',
    time: new Date().toISOString(),
    ownerConfigured: true,
    platform: 'Vercel Serverless'
  });
}
