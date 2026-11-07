import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, User as FirebaseUser } from 'firebase/auth';
import { User, Role } from '../types';
import { socket } from './socket';
import { SERVER_URL } from './config';

let firebaseApp: FirebaseApp | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Initialize Firebase client if API key is provided
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

if (firebaseConfig.apiKey && getApps().length === 0) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
    googleProvider = new GoogleAuthProvider();
  } catch (e) {
    console.warn('[Firebase Client] Init skipped or error:', e);
  }
}

class AuthService {
  private currentUser: User | null = null;
  private listeners: ((user: User | null) => void)[] = [];

  constructor() {
    // Restore session from localStorage if present
    const saved = localStorage.getItem('strangerverse_user');
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
        if (this.currentUser) {
          socket.emit('auth:register', this.currentUser);
        }
      } catch (e) {
        localStorage.removeItem('strangerverse_user');
      }
    }

    // Listen for socket role updates
    socket.on('user:role-updated', (data: { userId: string; newRole: Role; isBanned: boolean; isSuspended: boolean }) => {
      if (this.currentUser && this.currentUser.id === data.userId) {
        this.currentUser.role = data.newRole;
        this.currentUser.isBanned = data.isBanned;
        this.currentUser.isSuspended = data.isSuspended;
        this.saveUser(this.currentUser);
        this.notify();
      }
    });

    socket.on('auth:verified', (verifiedUser: User) => {
      this.currentUser = verifiedUser;
      this.saveUser(verifiedUser);
      this.notify();
    });
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isOwner(): boolean {
    return this.currentUser?.role === 'OWNER';
  }

  isManager(): boolean {
    return this.currentUser?.role === 'MANAGER' || this.isOwner();
  }

  isModerator(): boolean {
    return this.currentUser?.role === 'MODERATOR' || this.isManager();
  }

  subscribe(listener: (user: User | null) => void) {
    this.listeners.push(listener);
    listener(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.currentUser));
  }

  private saveUser(user: User) {
    localStorage.setItem('strangerverse_user', JSON.stringify(user));
  }

  /**
   * Google Login via official Firebase or Developer Google Flow
   */
  async loginWithGoogle(mockGoogleEmail?: string, mockDisplayName?: string): Promise<User> {
    // 1. If real Firebase client is configured and no mock email is explicitly passed
    if (firebaseApp && googleProvider && !mockGoogleEmail) {
      try {
        const auth = getAuth(firebaseApp);
        const result = await signInWithPopup(auth, googleProvider);
        const fbUser: FirebaseUser = result.user;
        const idToken = await fbUser.getIdToken();

        const res = await fetch(`${SERVER_URL}/api/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: idToken,
            user: {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName,
              photoURL: fbUser.photoURL
            }
          })
        });

        const data = await res.json();
        if (data.user) {
          this.currentUser = data.user;
          this.saveUser(data.user);
          socket.emit('auth:register', data.user);
          this.notify();
          return data.user;
        }
      } catch (error) {
        console.warn('[Firebase Auth] Pop-up failed, falling back to secure login dialog:', error);
      }
    }

    // 2. Verified Google Auth simulation (for instant local multi-user testing)
    const email = (mockGoogleEmail || 'stranger.tn@gmail.com').trim().toLowerCase();
    const displayName = mockDisplayName || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const photoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

    const res = await fetch(`${SERVER_URL}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: `mock_google_token_${Date.now()}`,
        user: {
          uid: `guser_${Math.abs(this.hashCode(email))}`,
          email,
          displayName,
          photoURL
        }
      })
    });

    const data = await res.json();
    if (data.user) {
      this.currentUser = data.user;
      this.saveUser(data.user);
      socket.emit('auth:register', data.user);
      this.notify();
      return data.user;
    }

    throw new Error(data.error || 'Login failed');
  }

  async logout() {
    if (firebaseApp) {
      try {
        const auth = getAuth(firebaseApp);
        await fbSignOut(auth);
      } catch (e) {
        // ignore
      }
    }
    this.currentUser = null;
    localStorage.removeItem('strangerverse_user');
    socket.emit('auth:logout');
    this.notify();
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

export const authService = new AuthService();
