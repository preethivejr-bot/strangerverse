import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, User as FirebaseUser } from 'firebase/auth';
import { User, Role } from '../types';
import { socket } from './socket';
import { SERVER_URL } from './config';

let firebaseApp: FirebaseApp | null = null;
let googleProvider: GoogleAuthProvider | null = null;

const OWNER_EMAIL = 'preethivejr@gmail.com';

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
        const fbEmail = (fbUser.email || '').trim().toLowerCase();
        const isOwner = fbEmail === OWNER_EMAIL;

        const realUser: User = {
          id: fbUser.uid,
          email: fbEmail,
          displayName: fbUser.displayName || 'Stranger',
          photoURL: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fbEmail)}`,
          role: isOwner ? 'OWNER' : 'NORMAL_USER',
          status: 'online',
          registeredAt: Date.now(),
          lastActive: Date.now()
        };

        // Try syncing with API endpoint
        try {
          const res = await fetch(`${SERVER_URL}/api/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: idToken,
              user: {
                uid: fbUser.uid,
                email: fbEmail,
                displayName: fbUser.displayName,
                photoURL: fbUser.photoURL
              }
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              this.currentUser = data.user;
              this.saveUser(data.user);
              socket.emit('auth:register', data.user);
              this.notify();
              return data.user;
            }
          }
        } catch (syncErr) {
          console.warn('[Auth Sync] Backend sync skipped, proceeding with authenticated Firebase session:', syncErr);
        }

        this.currentUser = realUser;
        this.saveUser(realUser);
        socket.emit('auth:register', realUser);
        this.notify();
        return realUser;
      } catch (error) {
        console.warn('[Firebase Auth] Pop-up failed or cancelled:', error);
        throw error;
      }
    }

    // 2. High-speed Google Auth flow with strict role segregation
    // Generate unique random stranger identifier if no email was entered
    const uniqueRand = Math.floor(1000 + Math.random() * 9000);
    const email = (mockGoogleEmail || `stranger_${uniqueRand}@strangerverse.io`).trim().toLowerCase();
    const isOwner = email === OWNER_EMAIL;
    
    // Normal users ALWAYS get their own name or Stranger identity
    const defaultName = isOwner ? 'Preethive (Super Manager)' : `Stranger ${uniqueRand}`;
    const displayName = mockDisplayName || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || defaultName;
    const photoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`;

    const authenticatedUser: User = {
      // Unique user ID prevents session conflicts between strangers
      id: isOwner ? 'user_preethive_owner' : `user_${Math.abs(this.hashCode(email))}_${Date.now()}`,
      email,
      displayName,
      photoURL,
      // STRICT: Only preethivejr@gmail.com can be OWNER
      role: isOwner ? 'OWNER' : 'NORMAL_USER',
      status: 'online',
      registeredAt: Date.now(),
      lastActive: Date.now()
    };

    // Try calling the verify endpoint
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: `token_${Date.now()}`,
          user: {
            uid: authenticatedUser.id,
            email,
            displayName,
            photoURL
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          this.currentUser = data.user;
          this.saveUser(data.user);
          socket.emit('auth:register', data.user);
          this.notify();
          return data.user;
        }
      }
    } catch (networkError) {
      console.warn('[Auth Network] Remote verify unreachable, activating local authenticated session:', networkError);
    }

    // Fallback: user is immediately logged in with proper role
    this.currentUser = authenticatedUser;
    this.saveUser(authenticatedUser);
    socket.emit('auth:register', authenticatedUser);
    this.notify();
    return authenticatedUser;
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
