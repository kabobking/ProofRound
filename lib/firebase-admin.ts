/**
 * Firebase Admin SDK initialization for server-side operations
 * Used in API routes for token verification and admin operations
 */

import * as admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

/**
 * Initialize Firebase Admin SDK
 * Uses the GOOGLE_APPLICATION_CREDENTIALS environment variable or default credentials
 */
export function getAdminApp(): admin.app.App {
  if (adminApp) {
    return adminApp;
  }

  try {
    // Check if we have a service account key
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'base64').toString()
      );

      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      // Use application default credentials (works in Cloud Functions, Cloud Run, etc)
      adminApp = admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }

    return adminApp;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

/**
 * Get Firebase Admin Auth instance
 */
export function getAdminAuth(): admin.auth.Auth {
  return getAdminApp().auth();
}

/**
 * Get Firestore instance (admin)
 */
export function getAdminFirestore(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}

/**
 * Verify ID token (server-side)
 */
export async function verifyIdToken(token: string) {
  const auth = getAdminAuth();
  return await auth.verifyIdToken(token);
}

/**
 * Get user by UID (admin)
 */
export async function getUser(uid: string) {
  const auth = getAdminAuth();
  return await auth.getUser(uid);
}

export default getAdminApp;
