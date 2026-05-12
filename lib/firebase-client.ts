/**
 * Firebase client initialization
 * Use this in client components to interact with Firebase services
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator,
  Auth,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  Firestore 
} from 'firebase/firestore';
import { getAnalytics, Analytics, logEvent } from 'firebase/analytics';
import firebaseConfig from './firebase-config';

let app: ReturnType<typeof initializeApp> | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let analytics: Analytics | null = null;

/**
 * Initialize Firebase (client-side)
 */
export function initFirebase() {
  if (app) return { app, auth, firestore, analytics };

  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
    
    // Initialize Analytics (safe to call even if Analytics is not enabled in Firebase Console)
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      console.warn('Analytics not available:', e);
    }

    // Enable offline persistence
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.warn('Could not enable persistence:', err);
    });

    // Uncomment to use Firebase emulators locally
    // if (process.env.NODE_ENV === 'development') {
    //   connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    //   connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
    // }

    return { app, auth, firestore, analytics };
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

/**
 * Get Auth instance (lazy init)
 */
export function getAuthInstance(): Auth {
  if (!auth) {
    const { auth: authInstance } = initFirebase();
    auth = authInstance!;
  }
  return auth;
}

/**
 * Get Firestore instance (lazy init)
 */
export function getFirestoreInstance(): Firestore {
  if (!firestore) {
    const { firestore: firestoreInstance } = initFirebase();
    firestore = firestoreInstance!;
  }
  return firestore;
}

/**
 * Get Analytics instance (lazy init)
 */
export function getAnalyticsInstance(): Analytics | null {
  if (!analytics) {
    const { analytics: analyticsInstance } = initFirebase();
    analytics = analyticsInstance;
  }
  return analytics;
}

/**
 * Log event to Firebase Analytics
 */
export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
  try {
    const analyticsInstance = getAnalyticsInstance();
    if (analyticsInstance) {
      logEvent(analyticsInstance, eventName, eventParams);
    }
  } catch (error) {
    console.warn('Failed to log analytics event:', error);
  }
}

export default initFirebase;
