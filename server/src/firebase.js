import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let isFirebaseInitialized = false;

// Attempt initializing Firebase Admin if credentials or env are provided
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFirebaseInitialized = true;
    console.log('[Firebase] Admin SDK initialized successfully with service account.');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp();
    isFirebaseInitialized = true;
    console.log('[Firebase] Admin SDK initialized with GOOGLE_APPLICATION_CREDENTIALS.');
  } else {
    console.log('[Firebase] No Service Account credentials detected. Running in Dual-Mode (Ready for Firebase credentials, fallback mock/dev auth active).');
  }
} catch (error) {
  console.warn('[Firebase] Initialization warning:', error.message);
}

/**
 * Verifies an ID token and returns the user identity.
 * In production with Firebase, uses admin.auth().verifyIdToken.
 * In dev/test mode, provides fallback validation.
 */
export async function verifyUserToken(token, clientUser) {
  if (isFirebaseInitialized && token && !token.startsWith('mock_')) {
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name || clientUser?.displayName || 'Stranger',
        photoURL: decoded.picture || clientUser?.photoURL || '',
        emailVerified: decoded.email_verified || false
      };
    } catch (e) {
      console.warn('[Firebase] verifyIdToken error:', e.message);
    }
  }

  // Fallback for dev/testing accounts or Google simulation
  if (clientUser && clientUser.email) {
    return {
      uid: clientUser.uid || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: clientUser.email.trim().toLowerCase(),
      displayName: clientUser.displayName || clientUser.email.split('@')[0],
      photoURL: clientUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${clientUser.displayName || 'stranger'}`,
      emailVerified: true
    };
  }

  return null;
}

/**
 * Sets custom claims for Firebase Auth users (e.g. role)
 */
export async function setFirebaseCustomRole(uid, role) {
  if (isFirebaseInitialized && uid && !uid.startsWith('user_')) {
    try {
      await admin.auth().setCustomUserClaims(uid, { role });
      console.log(`[Firebase] Assigned custom claim role: ${role} to ${uid}`);
      return true;
    } catch (e) {
      console.error('[Firebase] Failed to set custom claims:', e.message);
      return false;
    }
  }
  return false;
}

export { isFirebaseInitialized };
