// Centralized Environment & Network Configuration

// Real-time Cloud WebSocket Server URL (Cloudflare Tunnel to real-time engine)
export const SOCKET_SERVER_URL: string = 
  import.meta.env.VITE_SOCKET_URL || 
  'https://governor-expo-virgin-mineral.trycloudflare.com';

// REST API Server URL (Native Vercel Edge API)
export const SERVER_URL: string = 
  import.meta.env.VITE_SERVER_URL || 
  (typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : window.location.origin)
    : '');

// Production-grade STUN & TURN servers for WebRTC audio calls
const iceServersList: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  // Metered OpenRelay community TURN for symmetric NAT & mobile network traversal
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

// If custom TURN server is configured via env
if (import.meta.env.VITE_TURN_SERVER_URL) {
  iceServersList.push({
    urls: import.meta.env.VITE_TURN_SERVER_URL,
    username: import.meta.env.VITE_TURN_USERNAME || '',
    credential: import.meta.env.VITE_TURN_CREDENTIAL || ''
  });
}

export const PRODUCTION_ICE_SERVERS: RTCConfiguration = {
  iceServers: iceServersList,
  iceCandidatePoolSize: 10
};
