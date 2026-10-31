/**
 * Firebase client initialization
 * Use this in client components to interact with Firebase services
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  Auth,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore 
} from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics, logEvent } from 'firebase/analytics';
import firebaseConfig from './firebase-config';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let analytics: Analytics | null = null;
let analyticsPromise: Promise<Analytics | null> | null = null;

/**
 * Initialize Firebase (client-side)
 */
export function initFirebase() {
  if (app && auth && firestore) return { app, auth, firestore, analytics };

  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
    
    // Initialize Analytics and Persistence safely on client-side only
    if (typeof window !== 'undefined') {
      if (!analyticsPromise) {
        analyticsPromise = isSupported()
          .then(supported => {
            if (supported && app) {
              try {
                analytics = getAnalytics(app);
                return analytics;
              } catch (e) {
                console.warn('Analytics initialization failed:', e);
              }
            }
            return null;
          })
          .catch(e => {
            console.warn('Analytics check failed:', e);
            return null;
          });
      }

      setPersistence(auth, browserLocalPersistence).catch(err => {
        console.warn('Could not enable persistence:', err);
      });
    }

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
    initFirebase();
  }
  return analytics;
}

/**
 * Log event to Firebase Analytics
 */
export function trackEvent(eventName: string, eventParams?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    initFirebase();
    if (analytics) {
      logEvent(analytics, eventName, eventParams);
    } else if (analyticsPromise) {
      analyticsPromise
        .then(inst => {
          if (inst) {
            logEvent(inst, eventName, eventParams);
          }
        })
        .catch(() => {});
    }
  } catch (error) {
    console.warn('Failed to log analytics event:', error);
  }
}

export default initFirebase;
